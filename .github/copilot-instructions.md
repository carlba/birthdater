# Project Guidelines

## Project Overview

This is a TypeScript project using ESM modules, Vitest for testing, ESLint + Prettier for code
quality, and nodemon/tsx for development.

## Build and Test

```bash
npm run build          # Compile TypeScript
npm run start:dev      # Start with hot-reload (nodemon + tsx)
npm test               # Run tests once (vitest)
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage
npm run lint           # Lint with ESLint
npm run format         # Format with Prettier
```

## Code Style

### Clean Code Principles

- **Meaningful names**: Every variable, function, parameter, and class name should clearly express
  its intent. Never use single-letter variables (except loop indices like `i` in trivial for-loops
  where no semantic name exists).
- **Functions do one thing**: Keep functions small and focused on a single responsibility. If a
  function needs a comment to explain what it does, rename it or split it.
- **Avoid magic numbers/strings**: Extract constants with descriptive names instead of using bare
  literals.
- **Prefer positive conditionals**: Write `if (isValid)` rather than `if (!isInvalid)`.
- **Limit function arguments**: Prefer fewer than three parameters. When more are needed, group
  related arguments into a named options object.
- **Don't repeat yourself**: Extract duplicated logic into well-named shared functions.
- **Comment the "why", not the "what"**: Code should be self-documenting. Reserve comments for
  non-obvious decisions, trade-offs, or workarounds — not descriptions of what the code already
  shows.

## Mandatory Post-Task Checklist

After completing **any** task, coding change, or file modification, you MUST always run these
commands in order before considering the task done:

1. `npm run lint` — check for linting violations; fix any errors found
2. `npm run build` — verify the project compiles successfully

Do not mark a task as complete or stop until both commands pass without errors. If either command
fails, fix the issue and re-run until both pass.

## Other

- Use try catch blocks when handling promises if there isn't a clear advantage of chaining.

### TypeScript

- Use strict TypeScript — leverage the existing `tsconfig.json` settings.
- Prefer `interface` for object shapes and `type` for unions, intersections, and aliases.
- Avoid `any`; use `unknown` when the type is genuinely uncertain and narrow it explicitly.
- Use `const` by default; only use `let` when reassignment is necessary.
- Prefer explicit return types on exported functions.
- Use ESM imports (`import`/`export`) — this project uses `"type": "module"`.
- Prefer named exports over default exports.

### Naming Conventions

| Construct              | Convention                      | Example                                 |
| ---------------------- | ------------------------------- | --------------------------------------- |
| Variables / parameters | camelCase, descriptive nouns    | `userResponse`, `retryCount`            |
| Functions              | camelCase, verb phrases         | `fetchUserProfile`, `parseErrorMessage` |
| Classes / Interfaces   | PascalCase                      | `HttpClient`, `UserRepository`          |
| Constants              | UPPER_SNAKE_CASE (module-level) | `MAX_RETRY_ATTEMPTS`                    |
| Types                  | PascalCase                      | `ApiResponse`, `RequestOptions`         |
| Files                  | kebab-case                      | `user-service.ts`, `parse-response.ts`  |

## Best Practices

### HTTP Requests

- Use [`got`](https://github.com/sindresorhus/got) as the HTTP client. Do not use `fetch`, `axios`,
  or `node-fetch`.
- Prefer `got.extend()` to create pre-configured instances with shared base URLs, headers, and retry
  logic.
- Always type the response using the generic overload: `got<ResponseType>(url, options)`.
- Handle HTTP errors with `got`'s built-in `HTTPError` — catch and re-throw with contextual
  information.

```ts
// Good
import got, { HTTPError } from 'got';

const apiClient = got.extend({
  prefixUrl: 'https://api.example.com',
  responseType: 'json',
});

async function fetchUser(userId: string): Promise<User> {
  try {
    return await apiClient.get<User>(`users/${userId}`).json();
  } catch (error) {
    if (error instanceof HTTPError) {
      throw new Error(`Failed to fetch user ${userId}: ${error.response.statusCode}`);
    }
    throw error;
  }
}
```

### CLI tools

Should use [Commander](https://www.npmjs.com/package/commander)

### Error Handling

- Never silently swallow errors with empty `catch` blocks.
- Wrap third-party errors with context before re-throwing.
- Validate all external inputs (API responses, environment variables, CLI args) at system
  boundaries.

### Environment Variables

- When running Node directly, prefer Node’s built-in `--env-file` parameter instead of a third-party
  loader.
- In production, environment variables should be injected by the platform or deployment environment.
- Access `process.env` only through a dedicated, validated config module — never scattered inline.
- Fail fast with a clear error if a required environment variable is missing at startup.

### Testing

- Use Vitest for all tests. Test files are co-located with source files using the `.spec.ts` suffix.
- Write tests that describe behavior, not implementation:
  `it('returns the user when the ID is valid', ...)`.
- Prefer `vi.mock` for mocking external dependencies; avoid mocking internals.
- Aim for meaningful coverage — test edge cases and error paths, not just the happy path.

## Conventions

- All source code lives in `src/`.
- Entry point is `src/index.ts`.
- Prefer early returns to reduce nesting.
