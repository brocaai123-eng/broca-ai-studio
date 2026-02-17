import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Use Resend's test domain for development if custom domain isn't verified
// For production, verify your domain at https://resend.com/domains
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const APP_NAME = 'BrocaAI';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ============================================================
// Collaboration Invite Email
// ============================================================

export interface SendCollaborationInviteEmailParams {
  to: string;
  invitedBrokerName: string;
  inviterName: string;
  clientName: string;
  clientId: string;
  role: string;
  roleDescription: string;
}

export async function sendCollaborationInviteEmail({
  to,
  invitedBrokerName,
  inviterName,
  clientName,
  clientId,
  role,
  roleDescription,
}: SendCollaborationInviteEmailParams) {
  const collaborationUrl = `${APP_URL}/dashboard/collaboration`;
  const caseUrl = `${APP_URL}/dashboard/clients/${clientId}`;

  console.log('Sending collaboration invite to:', to);
  console.log('From:', `${APP_NAME} <${FROM_EMAIL}>`);

  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `${inviterName} invited you to collaborate on a case - ${APP_NAME}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Collaboration Invite - ${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🤝 ${APP_NAME}
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                Case Collaboration Invite
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">
                Hi ${invitedBrokerName || 'there'}! 👋
              </h2>
              
              <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                <strong>${inviterName}</strong> has invited you to collaborate on a case in ${APP_NAME}.
              </p>
              
              <!-- Case Details -->
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; color: #166534; font-size: 14px;">
                      📋 <strong>Case:</strong> ${clientName}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #166534; font-size: 14px;">
                      🏷️ <strong>Your Role:</strong> ${role}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #166534; font-size: 14px;">
                      📝 <strong>Role Description:</strong> ${roleDescription}
                    </td>
                  </tr>
                </table>
              </div>
              
              <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Log in to your ${APP_NAME} dashboard to accept the invitation and start collaborating:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${collaborationUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);">
                      View Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0; color: #a1a1aa; font-size: 13px; text-align: center;">
                Or go directly to the case: <a href="${caseUrl}" style="color: #22c55e; text-decoration: underline;">Open Case</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">
                This is an automated message from ${APP_NAME}. 
                You received this because ${inviterName} added you as a collaborator.
              </p>
              <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    console.error('Failed to send collaboration invite email:', error);
    throw new Error(`Failed to send collaboration invite email: ${error.message}`);
  }

  console.log('Collaboration invite email sent successfully:', data);
  return data;
}

// ============================================================
// Broker Invitation Email (Signup)
// ============================================================

export interface SendInvitationEmailParams {
  to: string;
  brokerName: string;
  invitationToken: string;
  planName?: string;
  expiresAt: Date;
}

export async function sendBrokerInvitationEmail({
  to,
  brokerName,
  invitationToken,
  planName,
  expiresAt,
}: SendInvitationEmailParams) {
  const signupUrl = `${APP_URL}/signup?invitation=${invitationToken}`;
  const expiresFormatted = expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  console.log('Sending email to:', to);
  console.log('From:', `${APP_NAME} <${FROM_EMAIL}>`);
  console.log('Signup URL:', signupUrl);

  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `You're invited to join ${APP_NAME}!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🚀 ${APP_NAME}
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                AI-Powered Client Onboarding
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">
                Hi ${brokerName || 'there'}! 👋
              </h2>
              
              <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                You've been invited to join <strong>${APP_NAME}</strong> – the intelligent platform that streamlines your client onboarding with AI-powered automation.
              </p>
              
              ${planName ? `
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; margin: 0 0 24px;">
                <p style="margin: 0; color: #166534; font-size: 14px;">
                  🎁 <strong>Your Plan:</strong> ${planName}
                </p>
              </div>
              ` : ''}
              
              <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Click the button below to create your account and get started:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #a1a1aa; font-size: 13px; text-align: center;">
                This invitation expires on ${expiresFormatted}
              </p>
            </td>
          </tr>
          
          <!-- Features -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <div style="background-color: #fafafa; border-radius: 12px; padding: 24px;">
                <h3 style="margin: 0 0 16px; color: #18181b; font-size: 16px; font-weight: 600;">
                  What you'll get with ${APP_NAME}:
                </h3>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #52525b; font-size: 14px;">
                      ✅ Customizable onboarding forms
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #52525b; font-size: 14px;">
                      ✅ AI-powered document extraction
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #52525b; font-size: 14px;">
                      ✅ Automated client notifications
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #52525b; font-size: 14px;">
                      ✅ Secure document storage
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 8px; color: #71717a; font-size: 12px;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

export interface SendOnboardingEmailParams {
  to: string;
  clientName: string;
  brokerName: string;
  onboardingLink: string;
  formName?: string;
}

export async function sendClientOnboardingEmail({
  to,
  clientName,
  brokerName,
  onboardingLink,
  formName,
}: SendOnboardingEmailParams) {
  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `${brokerName} has invited you to complete your onboarding`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Complete Your Onboarding</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #18181b; font-size: 18px;">
                Hi ${clientName}! 👋
              </p>
              <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                <strong>${brokerName}</strong> has invited you to complete your onboarding${formName ? ` using the <strong>${formName}</strong> form` : ''}.
              </p>
              <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Please click the button below to get started:
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${onboardingLink}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px;">
                      Start Onboarding
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                This is an automated message from ${APP_NAME}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

export async function sendSubscriptionConfirmationEmail({
  to,
  brokerName,
  planName,
  tokensAllocated,
}: {
  to: string;
  brokerName: string;
  planName: string;
  tokensAllocated: number;
}) {
  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `Welcome to ${APP_NAME}! Your subscription is active 🎉`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">🎉 Subscription Confirmed!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #18181b; font-size: 18px;">
                Welcome, ${brokerName}!
              </p>
              <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Your <strong>${planName}</strong> subscription is now active. Here's what you've unlocked:
              </p>
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
                <p style="margin: 0; color: #166534; font-size: 24px; font-weight: 700; text-align: center;">
                  ${tokensAllocated === -1 ? '∞ Unlimited' : tokensAllocated.toLocaleString()} Tokens
                </p>
                <p style="margin: 8px 0 0; color: #166534; font-size: 14px; text-align: center;">
                  Available this month
                </p>
              </div>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                Thank you for choosing ${APP_NAME}!
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

// Send notification to broker when client completes onboarding
export async function sendClientOnboardingCompleteEmail({
  to,
  brokerName,
  clientName,
  clientEmail,
  documentsCount,
  hasAiExtraction,
  clientViewUrl,
}: {
  to: string;
  brokerName: string;
  clientName: string;
  clientEmail: string;
  documentsCount: number;
  hasAiExtraction: boolean;
  clientViewUrl: string;
}) {
  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `✅ ${clientName} completed their onboarding!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">✅ Onboarding Complete!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #18181b; font-size: 18px;">
                Hi ${brokerName}! 👋
              </p>
              <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Great news! <strong>${clientName}</strong> has completed their onboarding form.
              </p>
              
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
                <h3 style="margin: 0 0 12px; color: #166534; font-size: 16px;">📋 Submission Summary</h3>
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0; color: #52525b;">Client Name:</td>
                    <td style="padding: 8px 0; color: #18181b; font-weight: 600;">${clientName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #52525b;">Email:</td>
                    <td style="padding: 8px 0; color: #18181b; font-weight: 600;">${clientEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #52525b;">Documents Uploaded:</td>
                    <td style="padding: 8px 0; color: #18181b; font-weight: 600;">${documentsCount}</td>
                  </tr>
                  ${hasAiExtraction ? `
                  <tr>
                    <td style="padding: 8px 0; color: #52525b;">AI Processing:</td>
                    <td style="padding: 8px 0; color: #16a34a; font-weight: 600;">✨ Data extracted from documents</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Click below to view all the submitted information and AI-extracted data:
              </p>
              
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${clientViewUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px;">
                      View Client Details
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                This is an automated notification from ${APP_NAME}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

// Broker Referral Email
export interface SendBrokerReferralEmailParams {
  to: string;
  referredName: string;
  referrerName: string;
  referralToken: string;
  expiresAt: Date;
}

export async function sendBrokerReferralEmail({
  to,
  referredName,
  referrerName,
  referralToken,
  expiresAt,
}: SendBrokerReferralEmailParams) {
  const signupUrl = `${APP_URL}/signup?ref=${referralToken}`;
  const expiresFormatted = expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `${referrerName} invites you to join ${APP_NAME}!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join ${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🎉 You've Been Invited!
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                Join ${APP_NAME} - AI-Powered Client Onboarding
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">
                Hi ${referredName}! 👋
              </h2>
              
              <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                <strong>${referrerName}</strong> thinks you'd love ${APP_NAME} – the intelligent platform that streamlines client onboarding with AI-powered automation.
              </p>
              
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
                <p style="margin: 0; color: #166534; font-size: 16px; text-align: center;">
                  🎁 <strong>Special Referral Invitation</strong>
                </p>
                <p style="margin: 10px 0 0; color: #15803d; font-size: 14px; text-align: center;">
                  Sign up now and start streamlining your client onboarding process!
                </p>
              </div>
              
              <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Click the button below to create your account and get started:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);">
                      Accept Invitation & Sign Up
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #a1a1aa; font-size: 13px; text-align: center;">
                This invitation expires on ${expiresFormatted}
              </p>
            </td>
          </tr>
          
          <!-- Features -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <div style="background-color: #fafafa; border-radius: 12px; padding: 24px;">
                <h3 style="margin: 0 0 16px; color: #18181b; font-size: 16px; font-weight: 600;">
                  What you'll get with ${APP_NAME}:
                </h3>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #52525b; font-size: 14px;">
                      ✅ Customizable onboarding forms
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #52525b; font-size: 14px;">
                      ✅ AI-powered document extraction
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #52525b; font-size: 14px;">
                      ✅ Automated client notifications
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #52525b; font-size: 14px;">
                      ✅ Secure document storage
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #52525b; font-size: 14px;">
                      ✅ Free tier with 150 tokens/month
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 8px; color: #71717a; font-size: 12px;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    throw new Error(`Failed to send referral email: ${error.message}`);
  }

  return data;
}
