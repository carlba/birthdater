#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { Command } from 'commander';
import got, { HTTPError } from 'got';
import { z } from 'zod';
import logger from './logger.js';

const apiClient = got.extend({
  responseType: 'json',
  retry: {
    limit: 5,
    methods: ['GET', 'POST', 'PATCH'],
    errorCodes: ['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN'],
    maxRetryAfter: 120,
  },
});

const envSchema = z.object({
  GOOGLE_CONTACTS_CLIENT_ID: z.string().min(1),
  GOOGLE_CONTACTS_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CONTACTS_REFRESH_TOKEN: z.string().min(1),
});

const csvHeaderSchema = z.object({
  Name: z.string().min(1),
  Year: z.string().optional(),
  Month: z.string().min(1),
  Day: z.string().min(1),
  'Link to Profile': z.string().optional(),
});

export type ContactCsvRow = z.infer<typeof csvHeaderSchema>;

export type UpdateResult =
  | {
      name: string;
      action: 'updated';
      resourceName: string;
      birthday: { year?: number; month: number; day: number };
      reason?: string;
    }
  | {
      name: string;
      action: 'skipped' | 'missing';
      resourceName?: string;
      reason?: string;
    }
  | {
      name: string;
      action: 'error';
      resourceName?: string;
      error: string;
    };

interface GooglePersonBirthday {
  date?: { year?: number; month?: number; day?: number };
}

interface GooglePersonName {
  displayName?: string;
}

interface GooglePerson {
  resourceName: string;
  etag?: string;
  names?: GooglePersonName[];
  birthdays?: GooglePersonBirthday[];
}

function parseCsvRow(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (inQuotes) {
      if (char === '"') {
        const next = line[index + 1];
        if (next === '"') {
          current += '"';
          index += 1;
          continue;
        }

        inQuotes = false;
        continue;
      }

      current += char;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map(value => value.trim());
}

export function parseCsv(content: string): ContactCsvRow[] {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const header = parseCsvRow(lines[0]);
  const expectedHeaders = ['Name', 'Year', 'Month', 'Day', 'Link to Profile'];

  if (
    header.length !== expectedHeaders.length ||
    !expectedHeaders.every((expected, index) => header[index] === expected)
  ) {
    throw new Error(`Unexpected CSV header. Expected: ${expectedHeaders.join(', ')}`);
  }

  return lines.slice(1).map(line => {
    const values = parseCsvRow(line);
    const row = Object.fromEntries(header.map((key, index) => [key, values[index] ?? '']));
    return csvHeaderSchema.parse(row);
  });
}

export function buildBirthday(row: ContactCsvRow): { year?: number; month: number; day: number } {
  const month = Number(row.Month);
  const day = Number(row.Day);
  const result: { year?: number; month: number; day: number } = { month, day };

  if (row.Year && row.Year.trim().length > 0) {
    result.year = Number(row.Year);
  }

  return result;
}

async function refreshAccessToken(): Promise<string> {
  const config = envSchema.parse(process.env);

  const response = await apiClient.post<{ access_token?: string }>(
    'https://oauth2.googleapis.com/token',
    {
      form: {
        client_id: config.GOOGLE_CONTACTS_CLIENT_ID,
        client_secret: config.GOOGLE_CONTACTS_CLIENT_SECRET,
        refresh_token: config.GOOGLE_CONTACTS_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      },
    }
  );

  const body = response.body;
  if (typeof body.access_token !== 'string') {
    throw new Error('Google OAuth response did not include an access_token');
  }

  return body.access_token;
}

function chooseBestMatch(name: string, people: GooglePerson[]): GooglePerson | null {
  const lowerName = name.toLowerCase();

  const exactMatch = people.find(person =>
    person.names?.some(nameObject => nameObject.displayName?.toLowerCase() === lowerName)
  );

  return exactMatch ?? people[0] ?? null;
}

async function searchContact(accessToken: string, name: string): Promise<GooglePerson | null> {
  const response = await apiClient('https://people.googleapis.com/v1/people:searchContacts', {
    searchParams: {
      query: name,
      pageSize: '10',
      readMask: 'names,birthdays',
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const body = response.body as {
    results?: { person?: GooglePerson }[];
  };

  const people = body.results?.flatMap(result => (result.person ? [result.person] : [])) ?? [];
  return chooseBestMatch(name, people);
}

async function updateContactBirthday(
  accessToken: string,
  resourceName: string,
  etag: string | undefined,
  birthday: { year?: number; month: number; day: number }
): Promise<void> {
  const updateUrl = `https://people.googleapis.com/v1/${resourceName}:updateContact`;
  const body: Record<string, unknown> = {
    resourceName,
    birthdays: [{ date: { ...birthday } }],
  };

  if (etag) {
    body.etag = etag;
  }

  await apiClient.patch(updateUrl, {
    searchParams: {
      updatePersonFields: 'birthdays',
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    json: body,
  });
}

async function writeResultFile(results: UpdateResult[], resultPath: string): Promise<void> {
  const lines = results.map(result => JSON.stringify(result)).join('\n') + '\n';
  await writeFile(resultPath, lines, 'utf8');
}

async function run(options: { csvPath: string; resultPath: string }): Promise<void> {
  const content = await readFile(options.csvPath, 'utf8');
  const rows = parseCsv(content);
  const accessToken = await refreshAccessToken();
  const results: UpdateResult[] = [];

  for (const row of rows) {
    let result: UpdateResult;

    try {
      const contact = await searchContact(accessToken, row.Name);
      if (!contact) {
        result = {
          name: row.Name,
          action: 'missing',
          reason: 'no matching contact found',
        };
        logger.info({ person: row.Name }, 'No contact match found');
      } else if (contact.birthdays && contact.birthdays.length > 0) {
        result = {
          name: row.Name,
          action: 'skipped',
          resourceName: contact.resourceName,
          reason: 'birthday already exists',
        };
        logger.info(
          { person: row.Name, resourceName: contact.resourceName },
          'Contact birthday already present'
        );
      } else {
        const birthday = buildBirthday(row);
        if (!birthday.month || !birthday.day) {
          result = {
            name: row.Name,
            action: 'error',
            error: 'invalid birthday in CSV row',
          };
          logger.warn({ person: row.Name }, 'Invalid birthday values in row');
        } else {
          await updateContactBirthday(accessToken, contact.resourceName, contact.etag, birthday);
          result = {
            name: row.Name,
            action: 'updated',
            resourceName: contact.resourceName,
            birthday,
            reason: 'birthday added',
          };
          logger.info(
            { person: row.Name, resourceName: contact.resourceName },
            'Updated contact birthday'
          );
        }
      }
    } catch (error) {
      const message =
        error instanceof HTTPError
          ? `${error.response.statusCode} ${error.message}`
          : error instanceof Error
            ? error.message
            : String(error);
      result = {
        name: row.Name,
        action: 'error',
        error: message,
      };
      logger.error({ person: row.Name, error: message }, 'Failed to process contact');
    }

    results.push(result);
  }

  await writeResultFile(results, options.resultPath);
  logger.info(
    { resultPath: options.resultPath, count: results.length },
    'Google Contacts update completed'
  );
}

const program = new Command();
program
  .description(
    'Update Google Contacts birthdays from a CSV file. Existing birthdays are preserved.'
  )
  .option('-c, --csv <path>', 'source CSV file path', 'src/facebook-dates-of-birth.csv')
  .option('-o, --result <path>', 'result JSONL file path', 'contact-updates.jsonl');

if (process.argv[1] === new URL(import.meta.url).pathname) {
  program.parse(process.argv);
  const options = program.opts();

  run({ csvPath: options.csv, resultPath: options.result }).catch(error => {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Script failed'
    );
    process.exit(1);
  });
}
