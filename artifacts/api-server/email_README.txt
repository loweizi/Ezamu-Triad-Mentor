EMAIL INVITATION SYSTEM (GUARDIAN INVITES)

Overview:
This project uses Resend to send email invitations for linking guardians to students in the triad system.

Students can invite guardians via email. The guardian must accept the invitation before gaining access to the student’s dashboard.

Features:

Email-based invitations
Pending / accepted / cancelled states
Secure linking between student and guardian
Guardian self-removal
Student invite cancellation

IMPORTANT (Development vs Production):

The system may use:
EMAIL_FROM=onboarding@resend.dev

This is a test domain and:

Works in development
ONLY sends emails to the Resend account owner

For production, a verified domain is required.

PRODUCTION SETUP:

1) Create a Resend Account
- Go to https://resend.com
- Use a company-owned email (not personal)
2) Verify Domain
- In Resend → Domains → Add Domain
- Enter your domain (example: ezamu.co.ke)
3) Add DNS Records
- Resend will provide SPF and DKIM records
- Go to your hosting provider (e.g., cPanel)
- Open Zone Editor
- Add all records exactly as provided
- Wait until domain shows as VERIFIED
4) Choose Sender Email
- Example: noreply@ezamu.co.ke
5) Generate API Key
- In Resend → API Keys → Create new key
- Full access is acceptable
6) Configure Backend Environment

File location:
artifacts/api-server/.env

Add:
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=Ezamu noreply@ezamu.co.ke

APP_BASE_URL=https://your-frontend-url

PORT=5000

7) Restart Backend
- Required after editing .env

TESTING FLOW:

1) Log in as student
2) Enter guardian email
3) Send invite
4) Check email inbox (and spam)
5) Accept invite
6) Log in as guardian
7) Confirm:
- Student data loads
- Access is read-only

DEVELOPMENT NOTES:

Email logic:
artifacts/api-server/src/lib/email.ts

Guardian routes:
artifacts/api-server/src/routes/users.ts

Environment variables are loaded using dotenv.

COMMON ISSUES:

Emails not sending:

- Check .env file location and values
- Restart backend
- Verify domain in Resend

403 Error:

- Occurs when using onboarding@resend.dev with external emails
- Fix by verifying domain

Email not received:

- Check spam/promotions
- Check Resend dashboard logs (NOT inbound email page)

SECURITY NOTES:

- Do NOT use a personal Resend account in production
- API keys must be stored securely
- Domain ownership should belong to the organization

FUTURE IMPROVEMENTS:

- Resend invite functionality
- Invite expiration (24–48 hours)
- Email templates / branding
- Notification when guardian accepts
- Rate limiting for invites