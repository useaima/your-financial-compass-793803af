# Security Policy

At EVA, we take the security of your financial data very seriously.

## Supported Versions

We only provide security updates for the current active deployment in production. Older standalone versions or unsupported forks are not maintained by us.

## Reporting a Vulnerability

If you discover any security-related issues, please do not disclose them publicly. Instead, email our security team at security@useaima.com or contact the repository owner directly.

We will acknowledge receipt of your vulnerability report within 48 hours and strive to send you regular updates about our progress.

## Secure Architecture Principles

1. **End-to-End Security:** We enforce strict HTTPS for all communications.
2. **Database Integrity:** Our Supabase backend relies on Postgres Row-Level Security (RLS) to ensure users can only access their own data.
3. **Authentication:** We use secure tokens with short lifetimes. Passwordless email magic links are the preferred method of access.
4. **Data Privacy:** We do not sell your personal financial data to third-party advertisers. All sensitive information (like linked account tokens) is heavily encrypted.
