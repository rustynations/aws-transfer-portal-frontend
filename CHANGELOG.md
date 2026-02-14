# Changelog

All notable changes to the AWS Transfer Portal web application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Activity logging for all operations
- Support for multiple user access types (ADMIN, WEB_ONLY, HYBRID, SFTP_ONLY)

### Security
- HTTPS-only API communication
- Cognito ID token authentication
- User file isolation
- Pre-signed URLs with expiration (15 min upload, 5 min download)
- Input validation and sanitization
- CORS configuration
- Secure session management

### Technical
- React 19 with TypeScript
- Vite for build tooling
- Cloudscape Design System components
- React Router for navigation
- amazon-cognito-identity-js for authentication
- Node.js polyfills for browser compatibility

## [Unreleased]

### Planned
- Multi-file upload support
- File preview capabilities
- Drag-and-drop file upload
- User profile management
- Email notifications for file operations
- Advanced search and filtering
- File sharing capabilities
- Bulk operations (delete multiple files)
- Export activity logs
- Custom branding options
