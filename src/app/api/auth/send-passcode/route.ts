import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, passcode, studentName, schoolName, purpose } = body;

    if (!email || !passcode) {
      return NextResponse.json(
        { success: false, error: 'Email and passcode are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanSchoolName = schoolName || 'Innovative International Secondary School';
    const isPasswordReset = purpose === 'STAFF_PASSWORD_RESET';
    const cleanStudentName = studentName || (isPasswordReset ? 'Staff Member' : 'your child');

    const subject = isPasswordReset
      ? `Security Passcode for Password Reset: [ ${passcode} ] - ${cleanSchoolName}`
      : `Official Result Access Passcode: [ ${passcode} ] - ${cleanSchoolName}`;

    const badgeTitle = isPasswordReset ? 'Staff Security & Identity' : 'ResultIQ™ Academic Registrar';
    const greeting = isPasswordReset ? `Hello <strong>${cleanStudentName}</strong>,` : `Dear Parent / Guardian of <strong>${cleanStudentName}</strong>,`;
    const introParagraph = isPasswordReset
      ? `You initiated a password reset request for your staff / administrator account at <strong>${cleanSchoolName}</strong>.`
      : `You requested a secure one-time access passcode to view official terminal assessment results on the ResultIQ Parent Portal.`;
    const instructionParagraph = isPasswordReset
      ? `<strong>Instructions:</strong> Copy the 6-digit verification passcode above, return to the password reset page, enter it with your new password, and click <strong>Reset Password & Update Account</strong>.`
      : `<strong>Instructions:</strong> Copy the 6-digit passcode above, return to the portal page, paste it into the <em>Access Passcode</em> field, and click <strong>Verify Passcode & Access Terminal Results</strong>.`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
        <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <div style="background: #0f172a; padding: 24px 28px; text-align: left;">
            <div style="display: inline-block; padding: 6px 12px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; color: #fbbf24; font-size: 11px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 8px;">
              ${badgeTitle}
            </div>
            <h1 style="color: #ffffff; font-size: 18px; margin: 0; font-weight: 700; line-height: 1.3;">
              ${cleanSchoolName}
            </h1>
            <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">
              ${isPasswordReset ? 'Official Academic Staff & Administrator Credential Recovery' : 'Official Terminal Examination & Continuous Assessment Portal'}
            </p>
          </div>

          <!-- Body -->
          <div style="padding: 28px;">
            <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-top: 0;">
              ${greeting}
            </p>
            <p style="font-size: 14px; line-height: 1.5; color: #334155;">
              ${introParagraph}
            </p>

            <!-- Passcode Display Box -->
            <div style="margin: 28px 0; padding: 20px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; text-align: center;">
              <span style="display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                Your 6-Digit Verification Passcode
              </span>
              <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a;">
                ${passcode}
              </div>
              <span style="display: block; font-size: 11px; color: #dc2626; font-weight: 600; margin-top: 8px;">
                ⏱️ Valid for 15 minutes • Do not share this code
              </span>
            </div>

            <p style="font-size: 13px; line-height: 1.5; color: #475569;">
              ${instructionParagraph}
            </p>

            <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px;">
              <p style="font-size: 11px; color: #94a3b8; line-height: 1.4; margin: 0;">
                🔒 <strong>Security Notice:</strong> If you did not initiate this request, please notify school IT administration immediately. Your current password remains unchanged until this code is verified.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `${isPasswordReset ? 'Staff Password Reset Verification Passcode' : 'Official Result Access Passcode'}\n\nSchool: ${cleanSchoolName}\nAccount: ${cleanStudentName}\nYour Passcode: ${passcode}\n\nValid for 15 minutes. Enter this code to verify and proceed.`;

    let emailSent = false;
    let providerUsed = 'none';
    let providerError = '';

    // 1. Resend API (Most popular & reliable for Next.js / Vercel)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      providerUsed = 'resend';
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || `${cleanSchoolName} <onboarding@resend.dev>`,
            to: [cleanEmail],
            subject,
            html: htmlContent,
            text: textContent,
          }),
        });

        if (resendRes.ok) {
          emailSent = true;
        } else {
          const errData = await resendRes.json();
          console.warn('Resend API returned an error:', errData);
          providerError = errData.message || 'Resend API rejected the email.';
          if (providerError.toLowerCase().includes('only send testing emails')) {
            providerError = `${providerError} (Note: On Resend free onboarding domain, emails can only be delivered to your Resend account email. Please test with that email, or verify a domain at resend.com/domains).`;
          }
        }
      } catch (err: any) {
        console.warn('Resend dispatch failed:', err);
        providerError = err?.message || 'Network error connecting to Resend.';
      }
    }

    // 2. Brevo / Sendinblue API (Sends to ANY recipient without domain DNS setup)
    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!emailSent && brevoApiKey) {
      providerUsed = 'brevo';
      const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM;
      try {
        const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': brevoApiKey,
          },
          body: JSON.stringify({
            sender: {
              name: cleanSchoolName,
              email: senderEmail || 'notifications@resultiq.com',
            },
            to: [{ email: cleanEmail }],
            subject,
            htmlContent,
            textContent,
          }),
        });

        if (brevoRes.ok) {
          emailSent = true;
          providerError = '';
        } else {
          const errData = await brevoRes.json();
          console.warn('Brevo dispatch failed:', errData);
          providerError = errData.message || 'Brevo API rejected the email.';
        }
      } catch (err: any) {
        console.warn('Brevo dispatch failed:', err);
        providerError = err?.message || 'Network error connecting to Brevo.';
      }
    }

    // 3. SendGrid API
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (!emailSent && sendgridApiKey) {
      providerUsed = 'sendgrid';
      try {
        const sendgridRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sendgridApiKey}`,
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: cleanEmail }] }],
            from: {
              email: process.env.EMAIL_FROM || 'no-reply@resultiq.app',
              name: cleanSchoolName,
            },
            subject,
            content: [
              { type: 'text/plain', value: textContent },
              { type: 'text/html', value: htmlContent },
            ],
          }),
        });

        if (sendgridRes.ok) {
          emailSent = true;
          providerError = '';
        } else {
          const errData = await sendgridRes.json().catch(() => ({}));
          console.warn('SendGrid dispatch failed:', errData);
          providerError = (errData as any).errors?.[0]?.message || 'SendGrid rejected the email.';
        }
      } catch (err: any) {
        console.warn('SendGrid dispatch failed:', err);
        providerError = err?.message || 'Network error connecting to SendGrid.';
      }
    }

    // 4. Custom Institutional Webhook (Zapier / Make / n8n / School Email Gateway)
    const webhookUrl = process.env.EMAIL_WEBHOOK_URL || process.env.NOTIFICATION_WEBHOOK_URL;
    if (!emailSent && webhookUrl) {
      providerUsed = 'webhook';
      try {
        const hookRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'PARENT_LOGIN_PASSCODE',
            email: cleanEmail,
            passcode,
            studentName: cleanStudentName,
            schoolName: cleanSchoolName,
            subject,
            timestamp: new Date().toISOString(),
          }),
        });

        if (hookRes.ok) {
          emailSent = true;
          providerError = '';
        }
      } catch (err) {
        console.warn('Webhook email dispatch failed:', err);
      }
    }

    // Log dispatch internally
    console.log(`[Passcode Dispatch] Provider: ${providerUsed} | Recipient: ${cleanEmail} | Status: ${emailSent ? 'DISPATCHED' : 'FAILED'} | Error: ${providerError}`);

    if (!emailSent) {
      if (!resendApiKey && !brevoApiKey && !sendgridApiKey && !webhookUrl) {
        providerError = 'No email provider API key configured on Vercel. Please add RESEND_API_KEY under Environment Variables in Vercel.';
      }
      return NextResponse.json({
        success: false,
        error: providerError || 'Failed to dispatch email.',
        provider: providerUsed,
        dispatched: false,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      provider: providerUsed,
      dispatched: true,
      message: `Access passcode dispatched to ${cleanEmail}.`,
    });
  } catch (error) {
    console.error('Failed to dispatch parent access passcode:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error dispatching passcode.' },
      { status: 500 }
    );
  }
}
