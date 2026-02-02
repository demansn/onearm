# Figma OAuth 2.0 Authentication System

**OAuth 2.0 Only** authentication system for Figma API with automatic token refresh. Personal Access Tokens are no longer supported.

## 🚀 Quick Start

### 1. Initial Setup
```bash
# Add to your .env file
FIGMA_CLIENT_ID=your_client_id_here
FIGMA_CLIENT_SECRET=your_client_secret_here
FILE_KEY=your_figma_file_key

# OAuth 2.0 is the only supported authentication method
```

### 2. Configure OAuth
```bash
npm run setup-oauth
```

This will:
- Open your browser for Figma authorization
- Store OAuth tokens securely in `.figma-tokens.json`
- Enable automatic token refresh

### 3. Start Using
```bash
npm run export  # Uses OAuth 2.0 exclusively
```

## 🔧 How It Works

### Authentication Method
- **OAuth 2.0 Only** - Automatic refresh, long-lived tokens
- **No Fallbacks** - OAuth credentials are mandatory for all operations

### Token Management
- **Access Token**: 2-8 hours validity (refreshed automatically)
- **Refresh Token**: Long-lived, used to get new access tokens
- **Storage**: Local `.figma-tokens.json` file (gitignored)

### Error Recovery
- Automatic retry on 401 Unauthorized errors
- Seamless token refresh in background
- Fallback to Personal Access Token if OAuth fails

## 📁 Files

### `FigmaAuth.js`
Main authentication class with:
- `getValidToken()` - Returns valid access token
- `makeAuthenticatedRequest()` - Authenticated fetch wrapper
- `refreshAccessToken()` - Refresh token logic
- Token storage and validation

### `setup-oauth.js`
Interactive OAuth setup utility:
- Temporary HTTP server for callback
- Browser-based authorization flow
- Token exchange and storage
- Setup validation

## 🛠 Troubleshooting

### "OAuth tokens not found"
Run `npm run setup-oauth` to perform initial authorization.

### "Invalid grant" error
Your refresh token may have expired. Re-run `npm run setup-oauth`.

### "OAuth credentials required" error
Add `FIGMA_CLIENT_ID` and `FIGMA_CLIENT_SECRET` to your `.env` file.

### Migration from Personal Access Tokens
Personal Access Tokens (`FIGMA_TOKEN`) are no longer supported. All authentication now uses OAuth 2.0 exclusively.

## 🔒 Security Notes

- Never commit `.figma-tokens.json` to version control
- Keep Client Secret in `.env` file only
- Tokens are stored locally and not transmitted except to Figma API
- Use HTTPS redirect URI in production environments
- OAuth 2.0 credentials are mandatory - no fallback authentication methods

## 🧪 Development

```javascript
// Using in your own scripts
import { FigmaAuth } from './auth/FigmaAuth.js';

const auth = new FigmaAuth();

// Get a valid token
const token = await auth.getValidToken();

// Make authenticated request
const response = await auth.makeAuthenticatedRequest(
    'https://api.figma.com/v1/files/your-file-key'
);
```