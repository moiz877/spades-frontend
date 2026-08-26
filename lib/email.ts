/**
 * Lead-alert email via Resend's REST API (no SDK dependency, just fetch).
 * Best-effort only — a failure here must never block a lead from being
 * saved. Callers should catch and log, not propagate.
 */
export interface LeadAlertPayload {
  email: string;
  companyName: string;
  isWorkEmailGuess: boolean;
  context: string | null;
}

export async function sendLeadAlertEmail(lead: LeadAlertPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.LEAD_ALERT_EMAIL;

  if (!apiKey || !toEmail) {
    console.warn(
      'Lead alert email skipped: RESEND_API_KEY or LEAD_ALERT_EMAIL not set. ' +
        'The lead was still saved to the database.'
    );
    return;
  }

  const fromEmail = process.env.LEAD_ALERT_FROM ?? 'onboarding@resend.dev';
  const contextLine = lead.context ? describeContext(lead.context) : 'General unlock';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject: `New lead: ${lead.companyName}${lead.isWorkEmailGuess ? '' : ' (personal email)'}`,
      text: [
        `Email: ${lead.email}`,
        `Company: ${lead.companyName}`,
        `Work email: ${lead.isWorkEmailGuess ? 'likely yes' : 'looks personal, still worth calling'}`,
        `Trigger: ${contextLine}`,
      ].join('\n'),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend API returned ${res.status}: ${body}`);
  }
}

/** Turns a raw context tag like "export:AEO.2026..." into a readable line. */
function describeContext(context: string): string {
  const [kind, detail] = context.split(':');
  if (kind === 'export') return `Tried to export a TEA report for ${detail}`;
  if (kind === 'compare') return `Hit the free comparison limit comparing ${detail}`;
  return context;
}
