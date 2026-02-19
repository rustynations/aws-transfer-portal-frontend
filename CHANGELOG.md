# Changelog

All notable changes to the AWS Transfer Portal web application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-02-19

### Added
- API key management UI in Profile page for users to create, view, and revoke their own API keys
- API key management in Users page for admins to manage API keys for any user
- Create API key modal with optional label and expiration settings
- One-time display of raw API key with copy-to-clipboard functionality
- API key table showing key ID, label, creation date, expiration, and last used timestamp
- Revoke API key confirmation modal with warning message
- API client functions: `listApiKeys`, `createApiKey`, `revokeApiKey`

### Changed
- Folder navigation tests updated to use single-click instead of double-click events
- API URL handling improved to consistently remove trailing slashes

### Fixed
- Added missing `getAdminSettings` mock in test files to prevent test failures
- Auth test corrected to use `totpRequired` callback instead of `mfaRequired`

## [1.1.0] - 2026-02-15

### Added
- TOTP MFA support: enable/disable MFA from Profile page with QR code enrollment
- MFA login challenge flow with TOTP code entry
- Admin MFA reset for users (Users management page)
- Folder creation and deletion with validation
- Hierarchical folder navigation with breadcrumb trail
- Path-aware file upload, download, and delete (works within subfolders)
- Tab navigation between My Files and Shared Files
- File list header with contextual action buttons
- Create folder modal with real-time inline validation
- Theme preference (light/dark/system) on Profile page
- Display name editing on Profile page
- Loading spinner (centered, styled) during app initialization
- Auto-focus on first input field across all login screens and create folder modal
- Logout now navigates to Files view (resets URL)
- TOTP validation utilities with comprehensive test coverage
- Path utilities for safe folder navigation
- Permission utilities for access control checks
- Notification hook for consistent error/success messaging
- Property-based tests for components and utilities
- Vitest configuration for frontend testing

### Changed
- File table uses Cloudscape Link component for folder names (no hardcoded colors)
- Folder click is single-click (not double-click)
- Folder dates display dash when not available
- Error responses now check both `error` and `message` fields from API
- Profile loading state matches full layout structure (consistent ContentLayout header)

### Fixed
- MFA login callback uses `totpRequired` instead of `mfaRequired` (amazon-cognito-identity-js)
- React key warning in Profile page caused by conditional Alert children inside SpaceBetween
- File deletion within subfolders (path parameter was not being passed)
- Upload within subfolders (path parameter was not being passed)

## [1.0.0] - 2026-02-13

### Added
- Initial release of AWS Transfer Portal web application
- Cognito-based authentication with email/password login
- File management page with upload, download, and delete operations
- Upload progress bar for large file transfers
- SSH key management page for SFTP access
- Admin dashboard with system statistics and activity monitoring
- Activity log filtering and pagination
- User management page for admins
- Root user protection (cannot modify/delete via web portal)
- Real-time storage statistics from DynamoDB
- Cloudscape Design System for AWS Console-like UI
- Responsive design for desktop and mobile
- Secure token management with automatic refresh
- Pre-signed URL generation for secure file operations

### Security
- HTTPS-only API communication
- Cognito ID token authentication
- User file isolation
- Pre-signed URLs with expiration (15 min upload, 5 min download)
- Input validation and sanitization
- CORS configuration
- Secure session management

[1.2.0]: https://github.com/rusty428/aws-transfer-portal-example/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/rusty428/aws-transfer-portal-example/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/rusty428/aws-transfer-portal-example/releases/tag/v1.0.0
