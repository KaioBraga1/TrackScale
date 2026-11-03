import { Resend } from 'resend'

const FROM = process.env.RESEND_FROM ?? 'TrackScale <noreply@trackscale.com.br>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://track-scale-r8j6.vercel.app'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY not configured')
  return new Resend(key)
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password/${token}`

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'Reset password — TrackScale',
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050507;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050507;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#13131f;border-radius:16px;border:1px solid #1e1e30;overflow:hidden;">
        <tr><td style="padding:32px 32px 24px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
            <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#a855f7,#7c3aed);display:flex;align-items:center;justify-content:center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="16 7 22 7 22 13" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <span style="color:#eeeef8;font-weight:700;font-size:18px;">TrackScale</span>
          </div>
          <h1 style="color:#eeeef8;font-size:22px;font-weight:600;margin:0 0 8px;">Reset your password</h1>
          <p style="color:#9898b8;font-size:14px;line-height:1.6;margin:0 0 28px;">We received a request to reset the password for your account. Click the button below to create a new password.</p>
          <a href="${resetUrl}" style="display:block;background:#a855f7;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;margin-bottom:20px;">Reset password</a>
          <p style="color:#55556a;font-size:12px;line-height:1.6;margin:0;">This link expires in <strong style="color:#9898b8;">1 hour</strong>. If you did not request a password reset, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #1e1e30;">
          <p style="color:#55556a;font-size:11px;margin:0;">Or copy and paste this link into your browser:<br><span style="color:#9898b8;word-break:break-all;">${resetUrl}</span></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}
