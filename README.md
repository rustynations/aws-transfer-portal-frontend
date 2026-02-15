# AWS Transfer Portal - Web Application

React-based web portal for managing file transfers via AWS Transfer Family. Built with Cloudscape Design System for a familiar AWS Console experience.

## Features

- **Secure Authentication**: Cognito-based login with email/password and optional TOTP MFA
- **File Management**: Upload with progress bar, download, delete, folder creation and navigation
- **Folder Navigation**: Hierarchical folders with breadcrumb trail, create/delete folders
- **SSH Key Management**: Add and manage SSH public keys for SFTP access
- **Admin Dashboard**: System statistics, activity monitoring with filtering and pagination (admin only)
- **User Management**: Create and manage user accounts with root user protection and MFA reset (admin only)
- **Profile Management**: Display name editing, theme preference, password change, MFA enrollment
- **Responsive Design**: Works on desktop and mobile devices using Cloudscape Design System
- **Real-Time Updates**: Dashboard shows current file counts and storage usage
- **Activity Logging**: All operations logged with username, action, and timestamp

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
│   ├── layout/
│   │   └── AppShell.tsx       # Main layout with navigation
│   ├── BreadcrumbTrail.tsx    # Folder breadcrumb navigation
│   ├── CreateFolderModal.tsx  # Folder creation with validation
│   ├── FileListHeader.tsx     # File list action buttons
│   ├── FileTable.tsx          # File/folder table with selection
│   ├── Notifications.tsx      # Flash notifications
│   └── TabNavigator.tsx       # My Files / Shared Files tabs
├── hooks/
│   └── useNotifications.ts    # Notification state management
├── pages/
│   ├── Login.tsx              # Login with MFA challenge support
│   ├── Files.tsx              # File management with folder navigation
│   ├── Profile.tsx            # Profile, theme, password, MFA settings
│   ├── SSHKeys.tsx            # SSH key management
│   ├── Users.tsx              # User management with MFA reset (admin)
│   └── Dashboard.tsx          # Admin dashboard
├── utils/
│   ├── auth.ts                # Cognito authentication with MFA
│   ├── api.ts                 # API client
│   ├── totp-validation.ts     # TOTP code validation utilities
│   ├── pathUtils.ts           # Folder path manipulation
│   ├── permissions.ts         # Access control helpers
│   └── theme.ts               # Theme preference management
├── config.ts                  # Configuration
├── App.tsx                    # Main app component
└── main.tsx                   # Entry point
```

## User Roles

### Regular Users (WEB_ONLY, HYBRID)
- View and manage their own files
- Upload files with progress indicator
- Download files via web portal
- Manage their SSH keys
- View Transfer Family endpoint for SFTP access

### Admin Users (ADMIN)
- All regular user capabilities
- View system dashboard with real-time statistics
- Create and manage user accounts (except root users)
- View and filter activity logs across all users
- Monitor storage usage and file counts

### Root Users (ADMIN with is_root flag)
- Created during bootstrap deployment
- Cannot be modified or deleted via web portal
- Must be managed via CDK redeployment
- Prevents accidental lockout

### SFTP-Only Users (SFTP_ONLY)
- Cannot access web portal
- SFTP access only via SSH keys
- Must have at least one SSH key configured

## Technology Stack

- **React 19**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Vitest**: Unit and property-based testing
- **Cloudscape Design System**: AWS-style UI components
- **React Router**: Client-side routing
- **amazon-cognito-identity-js**: Cognito authentication with MFA
- **qrcode.react**: QR code generation for TOTP enrollment

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
- Verify the user has WEB_ONLY, HYBRID, or ADMIN access type (not SFTP_ONLY)

### API requests return 401 Unauthorized
- Verify environment variables are correct
- Check that ID token is being sent (not access token)
- Ensure Cognito authorizer is configured in API Gateway
- Try logging out and logging back in to refresh tokens

### Files don't upload
- Check CORS configuration on S3 bucket
- Verify pre-signed URL hasn't expired (15 min limit)
- Check browser console for errors
- Ensure file name doesn't contain special characters

### Storage statistics not updating
- Statistics are updated in real-time by S3 event handler
- Check CloudWatch Logs for S3 event handler Lambda
- Verify S3 bucket has event notifications configured
- Dashboard shows current values from DynamoDB

### Cannot delete or modify root user
- Root users are protected and can only be managed via CDK
- This is intentional to prevent accidental lockout
- Deploy infrastructure changes to modify root users

### SSH keys page shows wrong endpoint
- Update `VITE_TRANSFER_ENDPOINT` in `.env.local`
- Restart dev server after changing environment variables
- Endpoint comes from CDK deployment outputs

### Activity log not showing recent operations
- Activity logs are stored in DynamoDB with 30-day retention
- Check that operations are completing successfully
- Verify DynamoDB activity table exists
- Use filtering to search for specific users or actions

## License

MIT License - see LICENSE file for details

---

Built with ❤️ using AWS services and Cloudscape Design System
