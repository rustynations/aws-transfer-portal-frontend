# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this Transfer Portal web application, please report it by:

1. **Opening a GitHub Issue**: [Create an issue](https://github.com/rusty428/aws-transfer-portal-example/issues) with the "security" label
2. **Email**: Contact the maintainer directly at rustynations@gmail.com

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

## Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Varies based on severity and complexity

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Best Practices

When using this web portal:

1. **Dependencies**: Regularly update dependencies to patch security vulnerabilities
   ```bash
   npm audit
   npm audit fix
   ```

2. **Environment Variables**: Never commit sensitive data to version control
   - Use `.env.local` for local development (already in `.gitignore`)
   - Store API endpoints and Cognito configuration securely
   - Never commit `.env.local` to git

3. **Authentication**: 
   - Uses AWS Cognito for secure authentication
   - ID tokens are stored in memory only (not localStorage)
   - Automatic token refresh on expiration
   - Secure session management

4. **API Security**: 
   - All API calls use HTTPS
   - Cognito ID tokens for authentication
   - User isolation enforced at API level
   - Pre-signed URLs with short expiration times

5. **File Operations**:
   - Upload URLs expire after 15 minutes
   - Download URLs expire after 5 minutes
   - User files are isolated in S3
   - File operations are logged for audit

6. **Admin Access**:
   - Root users cannot be deleted via web portal
   - Admin operations require ADMIN access type
   - All user management actions are logged
   - Activity logs retained for 30 days

## Known Security Features

This application implements:

- ✅ Cognito authentication with password policies
- ✅ HTTPS-only API communication
- ✅ User isolation at storage level
- ✅ Audit logging of all operations
- ✅ Root user protection
- ✅ Secure token management
- ✅ Input validation and sanitization
- ✅ CORS configuration
- ✅ Pre-signed URL expiration

## Production Deployment Recommendations

Before deploying to production:

1. **CloudFront**: Deploy behind CloudFront with:
   - AWS WAF for DDoS protection
   - Custom domain with SSL certificate
   - Appropriate cache policies
   - Security headers (CSP, HSTS, X-Frame-Options)

2. **Monitoring**: Enable:
   - CloudWatch alarms for failed logins
   - API Gateway access logs
   - Lambda function error tracking
   - S3 access logging

3. **Compliance**: Consider:
   - Data retention policies
   - User data privacy requirements
   - Access control auditing
   - Encryption at rest and in transit

4. **Testing**: Implement:
   - Automated security scanning
   - Penetration testing
   - Dependency vulnerability scanning
   - Regular security audits
