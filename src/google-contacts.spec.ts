import { describe, expect, it } from 'vitest';
import { buildBirthday, parseCsv } from './google-contacts.js';

describe('google-contacts CSV parsing', () => {
  it('parses a CSV with quoted fields and an empty year cell', () => {
    const csv = `"Name","Year","Month","Day","Link to Profile"\n"Andre Silveira","","1","17","https://facebook.com/1437789369"\n"Tobias Dahl","1992","1","1","https://facebook.com/582362727"`;

    const rows = parseCsv(csv);
    expect(rows).toEqual([
      {
        Name: 'Andre Silveira',
        Year: '',
        Month: '1',
        Day: '17',
        'Link to Profile': 'https://facebook.com/1437789369',
      },
      {
        Name: 'Tobias Dahl',
        Year: '1992',
        Month: '1',
        Day: '1',
        'Link to Profile': 'https://facebook.com/582362727',
      },
    ]);
  });

  it('throws when CSV headers are invalid', () => {
    const csv = 'Wrong,Header\nvalue';
    expect(() => parseCsv(csv)).toThrow('Unexpected CSV header');
  });
});

describe('google-contacts birthday payload', () => {
  it('builds a birthday payload with year when provided', () => {
    const birthday = buildBirthday({
      Name: 'Test',
      Year: '1984',
      Month: '5',
      Day: '9',
      'Link to Profile': '',
    });
    expect(birthday).toEqual({ year: 1984, month: 5, day: 9 });
  });

  it('builds a birthday payload without year when year is empty', () => {
    const birthday = buildBirthday({
      Name: 'Test',
      Year: '',
      Month: '5',
      Day: '9',
      'Link to Profile': '',
    });
    expect(birthday).toEqual({ month: 5, day: 9 });
  });
});
