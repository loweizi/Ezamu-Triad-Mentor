import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM;
const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

type SendGuardianInviteEmailArgs = {
    to: string;
    studentFirstName: string;
    studentLastName: string;
};

export async function sendGuardianInviteEmail({
    to,
    studentFirstName,
    studentLastName,
}: SendGuardianInviteEmailArgs): Promise<void> {
    if (!resend) {
        throw new Error("RESEND_API_KEY is not configured");
    }

    if (!emailFrom) {
        throw new Error("EMAIL_FROM is not configured");
    }

    console.log("RESEND_API_KEY loaded?", !!process.env.RESEND_API_KEY);
    console.log("EMAIL_FROM loaded?", process.env.EMAIL_FROM);

    const studentName = `${studentFirstName} ${studentLastName}`.trim();
    const guardianDashboardUrl = `${appBaseUrl}/guardian-dashboard`;

    const subject = `${studentName} invited you to connect as their guardian on Ezamu`;

    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #121c34;">
      <h2 style="margin-bottom: 12px;">You're invited to join Ezamu as a guardian</h2>
      <p style="margin: 0 0 12px;">
        <strong>${studentName}</strong> invited you to connect as their guardian on Ezamu.
      </p>
      <p style="margin: 0 0 12px;">
        To review and accept the invitation, sign in using this email address and visit your guardian dashboard.
      </p>
      <p style="margin: 0 0 20px;">
        <a
          href="${guardianDashboardUrl}"
          style="display: inline-block; background: #121c34; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 8px;"
        >
          Open Guardian Dashboard
        </a>
      </p>
      <p style="margin: 0 0 8px; color: #607b7d; font-size: 14px;">
        If you did not expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `;

    const text = [
        `You're invited to join Ezamu as a guardian.`,
        ``,
        `${studentName} invited you to connect as their guardian on Ezamu.`,
        ``,
        `To review and accept the invitation, sign in using this email address and visit your guardian dashboard:`,
        `${guardianDashboardUrl}`,
        ``,
        `If you did not expect this invitation, you can safely ignore this email.`,
    ].join("\n");

    await resend.emails.send({
        from: emailFrom,
        to,
        subject,
        html,
        text,
    });
}