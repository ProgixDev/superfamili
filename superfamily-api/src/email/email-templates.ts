/**
 * HTML email templates for transactional auth flows.
 *
 * Design goals:
 *   - Inline styles only (most email clients strip <style> blocks).
 *   - Max 600px wide, centered.
 *   - Logo is wrapped in an <a> so clicking it opens the homepage.
 *   - Brand palette pulled from the web app's globals.css.
 */

export interface EmailChrome {
  logoUrl: string;
  homepageUrl: string;
  fromName: string;
}

const COLORS = {
  primary: '#2E7D52',
  primaryDark: '#1B5E38',
  text: '#1C2B20',
  muted: '#607060',
  border: '#D8EAE0',
  bg: '#F4FAF6',
  codeBg: '#E8F5EE',
};

function baseLayout(chrome: EmailChrome, inner: string, previewText: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(chrome.fromName)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLORS.text};">
<span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(previewText)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${COLORS.bg};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">
        <tr>
          <td align="center" style="padding:8px 0 24px;">
            <a href="${escapeAttr(chrome.homepageUrl)}" target="_blank" rel="noopener" style="text-decoration:none;border:0;outline:none;">
              <img src="${escapeAttr(chrome.logoUrl)}" alt="${escapeAttr(chrome.fromName)}" width="140" style="display:block;height:auto;max-height:48px;border:0;outline:none;text-decoration:none;">
            </a>
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff;border:1px solid ${COLORS.border};border-radius:16px;padding:40px 32px;">
            ${inner}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:24px 16px 8px;font-size:12px;color:${COLORS.muted};line-height:1.6;">
            &copy; ${new Date().getFullYear()} ${escapeHtml(chrome.fromName)} &middot;
            <a href="${escapeAttr(chrome.homepageUrl)}" target="_blank" rel="noopener" style="color:${COLORS.muted};text-decoration:underline;">${escapeHtml(stripScheme(chrome.homepageUrl))}</a>
            <br>
            Vous recevez ce courriel parce qu'une action a &eacute;t&eacute; demand&eacute;e pour ce compte.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function otpBlock(code: string) {
  return `<div style="margin:28px 0;text-align:center;">
  <div style="display:inline-block;background-color:${COLORS.codeBg};border:1px solid ${COLORS.border};border-radius:12px;padding:18px 28px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:10px;color:${COLORS.primaryDark};">${escapeHtml(code)}</div>
</div>`;
}

function heading(text: string) {
  return `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${COLORS.text};font-weight:700;">${escapeHtml(text)}</h1>`;
}

function paragraph(text: string) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLORS.text};">${text}</p>`;
}

function mutedLine(text: string) {
  return `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${COLORS.muted};">${escapeHtml(text)}</p>`;
}

/** OTP for finishing signup (verify email). */
export function signupVerificationEmail(
  chrome: EmailChrome,
  params: { firstName?: string; code: string; expiresInMinutes: number },
) {
  const greeting = params.firstName
    ? `Bonjour ${escapeHtml(params.firstName)},`
    : 'Bonjour,';
  const inner = [
    heading('V\u00e9rification de votre adresse courriel'),
    paragraph(greeting),
    paragraph(
      `Merci de vous \u00eatre inscrit sur ${escapeHtml(chrome.fromName)}. Voici votre code de v\u00e9rification \u00e0 six chiffres\u00a0:`,
    ),
    otpBlock(params.code),
    paragraph(
      `Ce code expire dans <strong>${params.expiresInMinutes} minutes</strong>.`,
    ),
    mutedLine(
      "Vous n'\u00eates pas \u00e0 l'origine de cette inscription\u00a0? Ignorez simplement ce message.",
    ),
  ].join('');
  return baseLayout(
    chrome,
    inner,
    `Votre code de v\u00e9rification ${chrome.fromName}: ${params.code}`,
  );
}

/** OTP for password reset (user enters code + new password). */
export function passwordResetEmail(
  chrome: EmailChrome,
  params: { firstName?: string; code: string; expiresInMinutes: number },
) {
  const greeting = params.firstName
    ? `Bonjour ${escapeHtml(params.firstName)},`
    : 'Bonjour,';
  const inner = [
    heading('R\u00e9initialisation de votre mot de passe'),
    paragraph(greeting),
    paragraph(
      'Nous avons re\u00e7u une demande de r\u00e9initialisation de votre mot de passe. Utilisez le code ci-dessous pour en d\u00e9finir un nouveau\u00a0:',
    ),
    otpBlock(params.code),
    paragraph(
      `Ce code expire dans <strong>${params.expiresInMinutes} minutes</strong>.`,
    ),
    mutedLine(
      "Vous n'avez pas demand\u00e9 de r\u00e9initialisation\u00a0? Votre mot de passe reste inchang\u00e9\u00a0; vous pouvez ignorer ce message.",
    ),
  ].join('');
  return baseLayout(
    chrome,
    inner,
    `Code de r\u00e9initialisation: ${params.code}`,
  );
}

/** OTP sent to the **new** email during an email-change flow. */
export function emailChangeEmail(
  chrome: EmailChrome,
  params: {
    firstName?: string;
    code: string;
    expiresInMinutes: number;
    newEmail: string;
  },
) {
  const greeting = params.firstName
    ? `Bonjour ${escapeHtml(params.firstName)},`
    : 'Bonjour,';
  const inner = [
    heading('Confirmez votre nouvelle adresse courriel'),
    paragraph(greeting),
    paragraph(
      `Vous avez demand\u00e9 \u00e0 changer l'adresse courriel de votre compte ${escapeHtml(chrome.fromName)} vers <strong>${escapeHtml(params.newEmail)}</strong>. Entrez ce code pour confirmer le changement\u00a0:`,
    ),
    otpBlock(params.code),
    paragraph(
      `Ce code expire dans <strong>${params.expiresInMinutes} minutes</strong>.`,
    ),
    mutedLine(
      "Vous n'\u00eates pas \u00e0 l'origine de cette demande\u00a0? Ignorez ce message et, si vous le souhaitez, changez votre mot de passe par pr\u00e9caution.",
    ),
  ].join('');
  return baseLayout(
    chrome,
    inner,
    `Confirmez votre nouvelle adresse: ${params.code}`,
  );
}

/** Notification sent to the **previous** email when the change completes. */
export function emailChangeNoticeEmail(
  chrome: EmailChrome,
  params: { firstName?: string; newEmail: string },
) {
  const greeting = params.firstName
    ? `Bonjour ${escapeHtml(params.firstName)},`
    : 'Bonjour,';
  const inner = [
    heading('Adresse courriel modifi\u00e9e'),
    paragraph(greeting),
    paragraph(
      `L'adresse courriel associ\u00e9e \u00e0 votre compte ${escapeHtml(chrome.fromName)} a \u00e9t\u00e9 remplac\u00e9e par <strong>${escapeHtml(params.newEmail)}</strong>.`,
    ),
    mutedLine(
      "Si ce n'est pas vous qui avez effectu\u00e9 ce changement, contactez imm\u00e9diatement notre \u00e9quipe de support.",
    ),
  ].join('');
  return baseLayout(
    chrome,
    inner,
    `Votre adresse ${chrome.fromName} a \u00e9t\u00e9 modifi\u00e9e`,
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// HTML escaping helpers. Email clients are forgiving, but user-controlled
// fields (firstName, newEmail) could still smuggle a stray '<' and break
// rendering or enable cross-mailbox shenanigans.
// ──────────────────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}
