# Google OAuth Setup Guide

This guide will help you set up Google OAuth for the Unified Inbox application.

## Prerequisites

- A Google account
- Access to Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "Unified Inbox")
5. Click "Create"

## Step 2: Enable Required APIs (Optional)

**Note**: For basic Google OAuth (email, profile), no additional APIs need to be enabled. The OAuth consent screen and credentials are sufficient.

If you need additional user data, you can optionally enable:
1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google People API" (for extended profile information)
3. Click on it and press "Enable" if needed

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type (unless you have a Google Workspace account)
3. Click "Create"
4. Fill in the required fields:
   - **App name**: Unified Inbox
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "Save and Continue"
6. Skip the "Scopes" step for now (click "Save and Continue")
7. Add test users if needed (for development)
8. Click "Save and Continue"

## Step 4: Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Enter a name (e.g., "Unified Inbox Web Client")
5. Add authorized redirect URIs:
   - For development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`
6. Click "Create"
7. Copy the **Client ID** and **Client Secret**

## Step 5: Update Environment Variables

1. Copy your Google OAuth credentials
2. Add them to your `.env.local` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## Step 6: Test the Integration

1. Start your development server: `npm run dev`
2. Go to `http://localhost:3000/login`
3. Click "Continue with Google"
4. Complete the OAuth flow
5. You should be redirected to the inbox page

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" error**
   - Make sure the redirect URI in Google Console matches exactly: `http://localhost:3000/api/auth/callback/google`
   - Check for trailing slashes or typos

2. **"access_blocked" error**
   - Make sure you've added your email as a test user in the OAuth consent screen
   - Verify the OAuth consent screen is properly configured

3. **"invalid_client" error**
   - Double-check your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`
   - Make sure there are no extra spaces or quotes

### Development vs Production

- **Development**: Use `http://localhost:3000` as the base URL
- **Production**: Update the authorized redirect URIs in Google Console to use your production domain

## Security Notes

- Never commit your `.env.local` file to version control
- Use different OAuth clients for development and production
- Regularly rotate your client secrets
- Monitor OAuth usage in Google Cloud Console

## Next Steps

Once Google OAuth is working:
1. Test user creation and login flows
2. Verify user data is properly stored in the database
3. Test the logout functionality
4. Consider adding additional OAuth providers if needed