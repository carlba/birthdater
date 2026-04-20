# birthdater

Update Google Contacts birthdays from a CSV file. 

Uses the CSV export generated from the
[Birthday Calendar Exporter for Facebook](https://chromewebstore.google.com/detail/birthday-calendar-exporte/imielmggcccenhgncmpjlehemlinhjjo) Chrome Extension.

## Install

```bash
npm install -g .
```

## Google credentials

1. Create a Google Cloud project.
   - Open the API Manager: https://console.developers.google.com/apis/library
   - Search for and enable the Google People API.
2. In the OAuth consent screen, configure a user type and add your email.
3. Create OAuth credentials for a "Desktop app" and note the client ID and secret.
   - This credential type is for native applications.
   - If you use the Google OAuth Playground with "Use your own OAuth credentials", you may need a Web app credential instead.
   - For the Playground, a Web app client needs this Authorized redirect URI:
     `https://developers.google.com/oauthplayground`
4. Obtain a refresh token using the Google OAuth Playground or another OAuth client.
   - The OAuth Playground is a Google web tool for manually exchanging auth codes and tokens.
   - Use scope: `https://www.googleapis.com/auth/contacts`
   - Enable "Use your own OAuth credentials" and enter the client ID and secret.
   - If you want to test the access token without `profile` scope, use:
     `https://people.googleapis.com/v1/people:searchContacts?query=me&readMask=names,birthdays`
   - If you get `redirect_uri_mismatch` with the Playground, switch to a Web app OAuth client and add the Playground redirect URI.
   - Exchange the authorization code for a refresh token.
5. Set the env vars before running the CLI:

```bash
export GOOGLE_CONTACTS_CLIENT_ID=your_client_id
export GOOGLE_CONTACTS_CLIENT_SECRET=your_client_secret
export GOOGLE_CONTACTS_REFRESH_TOKEN=your_refresh_token
```

## Usage

```bash
GOOGLE_CONTACTS_CLIENT_ID=your_client_id \
GOOGLE_CONTACTS_CLIENT_SECRET=your_client_secret \
GOOGLE_CONTACTS_REFRESH_TOKEN=your_refresh_token \
birthdater --csv src/facebook-dates-of-birth.csv --result contact-updates.jsonl
```

Each line in `contact-updates.jsonl` is a JSON object describing the person and the action taken.

## Local development

```bash
npm run google-contacts -- --csv src/facebook-dates-of-birth.csv --result contact-updates.jsonl
```

## Scripts

- `npm run build`
- `npm run google-contacts`
- `npm run lint`
- `npm test`
- `npm run format`
