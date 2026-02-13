# AWS Transfer Portal - Web Application

React-based web portal for managing file transfers via AWS Transfer Family. Built with Cloudscape Design System for a familiar AWS Console experience.

## Features

- **Secure Authentication**: Cognito-based login with email/password
- **File Management**: Upload, download, and delete files with pre-signed URLs
- **SSH Key Management**: Add and manage SSH public keys for SFTP access
- **Admin Dashboard**: System statistics and activity monitoring (admin only)
- **User Management**: Create and manage user accounts (admin only)
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Node.js 18+ and npm
- Deployed AWS Transfer Portal Kit infrastructure
- CDK deployment outputs (API endpoint, Cognito pool IDs, etc.)

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env.local
   ```

3. **Update `.env.local`** with your CDK deployment outputs:
   - `VITE_API_ENDPOINT`: API Gateway endpoint URL
   - `VITE_USER_POOL_ID`: Cognito User Pool ID
   - `VITE_USER_POOL_CLIENT_ID`: Cognito User Pool Client ID
   - `VITE_AWS_REGION`: AWS region (e.g., us-east-1)
   - `VITE_TRANSFER_ENDPOINT`: Transfer Family server endpoint

4. **Start development server**:
   ```bash
   npm run dev
   ```

   The app will be available at http://localhost:5173

## Building for Production

```bash
npm run build
```

The production build will be in the `dist/` directory, ready to deploy to S3 + CloudFront.

## Project Structure

```
src/
├── components/
│   └── layout/
│       └── AppShell.tsx       # Main layout with navigation
├── pages/
│   ├── Login.tsx              # Login page
│   ├── Files.tsx              # File management
│   ├── SSHKeys.tsx            # SSH key management
│   ├── Users.tsx              # User management (admin)
│   └── Dashboard.tsx          # Admin dashboard
├── utils/
│   ├── auth.ts                # Cognito authentication
│   └── api.ts                 # API client
├── config.ts                  # Configuration
├── App.tsx                    # Main app component
└── main.tsx                   # Entry point
```

## User Roles

### Regular Users (WEB_ONLY, HYBRID)
- View and manage their own files
- Upload and download files via web portal
- Manage their SSH keys

### Admin Users (ADMIN)
- All regular user capabilities
- View system dashboard with statistics
- Create and manage user accounts
- View activity logs across all users

### SFTP-Only Users (SFTP_ONLY)
- Cannot access web portal
- SFTP access only via SSH keys

## Technology Stack

- **React 19**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Cloudscape Design System**: AWS-style UI components
- **React Router**: Client-side routing
- **amazon-cognito-identity-js**: Cognito authentication

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npm run build
```

## Deployment

The web portal can be deployed to:

1. **S3 + CloudFront** (recommended):
   - Build the app: `npm run build`
   - Upload `dist/` contents to S3 bucket
   - Configure CloudFront distribution
   - Update CORS settings in API Gateway

2. **Any static hosting service**:
   - Netlify, Vercel, GitHub Pages, etc.
   - Ensure environment variables are configured

## Troubleshooting

### Login fails with "User does not exist"
- Ensure the user exists in Cognito User Pool
- Check that the user was created via the API (not manually in console)

### API requests return 401 Unauthorized
- Verify environment variables are correct
- Check that ID token is being sent (not access token)
- Ensure Cognito authorizer is configured in API Gateway

### Files don't upload
- Check CORS configuration on S3 bucket
- Verify pre-signed URL hasn't expired (15 min limit)
- Check browser console for errors

### SSH keys page shows wrong endpoint
- Update `VITE_TRANSFER_ENDPOINT` in `.env.local`
- Restart dev server after changing environment variables

## License

MIT License - see LICENSE file for details

---

Built with ❤️ using AWS services and Cloudscape Design System
