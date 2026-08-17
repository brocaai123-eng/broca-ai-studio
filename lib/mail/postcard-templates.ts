import type { LobPostcardSize } from '@/lib/mail/lob';

export type PostcardCreativeMode = 'plain' | 'upload' | 'url' | 'template' | 'ai_html';

export interface BuiltInPostcardTemplate {
  id: string;
  name: string;
  description: string;
  size: LobPostcardSize;
  front_html: string;
  back_html: string;
}

/** Built-in marketing HTML shells sized for Lob (WebKit renderer). Keep address zone clear on back. */
export const BUILT_IN_POSTCARD_TEMPLATES: BuiltInPostcardTemplate[] = [
  {
    id: 'builtin-emerald-4x6',
    name: 'Emerald partnership (4x6)',
    description: 'Bold green marketing front with soft CTA on the back.',
    size: '4x6',
    front_html: `<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;width:4.25in;height:6.25in;font-family:Georgia,serif;background:linear-gradient(160deg,#064e3b 0%,#059669 55%,#a7f3d0 100%);color:#fff;">
  <div style="padding:0.45in 0.4in;">
    <p style="margin:0;font-size:11pt;letter-spacing:0.12em;text-transform:uppercase;opacity:0.9;">{{from_name}}</p>
    <h1 style="margin:0.35in 0 0.2in;font-size:28pt;line-height:1.15;font-weight:normal;">Grow your practice with the right partners</h1>
    <p style="margin:0;font-size:13pt;line-height:1.45;max-width:3.2in;">Hello {{name}} — opportunities tailored for clinics ready to expand referrals and visibility.</p>
    <div style="margin-top:0.55in;display:inline-block;background:#fff;color:#064e3b;padding:10px 18px;border-radius:4px;font-size:12pt;font-weight:bold;">Let's connect</div>
  </div>
</body></html>`,
    back_html: `<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;width:4.25in;height:6.25in;font-family:Georgia,serif;background:#f8fafc;color:#0f172a;">
  <div style="padding:0.4in;width:2.1in;">
    <p style="margin:0 0 0.2in;font-size:14pt;color:#064e3b;">{{name}},</p>
    <p style="margin:0 0 0.2in;font-size:11pt;line-height:1.45;">We help healthcare practices reach the right partners. Reply to learn more about tailored outreach.</p>
    <p style="margin:0;font-size:10pt;line-height:1.4;color:#334155;">{{from_name}}<br/>{{from_address}}</p>
  </div>
  <!-- Lob ink-free address zone: keep bottom-right clear (~3.28" × 2.375") -->
</body></html>`,
  },
  {
    id: 'builtin-slate-4x6',
    name: 'Slate professional (4x6)',
    description: 'Clean professional layout for clinical outreach.',
    size: '4x6',
    front_html: `<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;width:4.25in;height:6.25in;font-family:Helvetica,Arial,sans-serif;background:#0f172a;color:#f8fafc;">
  <div style="padding:0.45in;">
    <div style="height:4px;width:1.2in;background:#38bdf8;margin-bottom:0.35in;"></div>
    <p style="margin:0;font-size:10pt;letter-spacing:0.14em;text-transform:uppercase;color:#94a3b8;">Provider outreach</p>
    <h1 style="margin:0.25in 0;font-size:26pt;line-height:1.2;font-weight:600;">A note for {{name}}</h1>
    <p style="margin:0;font-size:12pt;line-height:1.5;color:#cbd5e1;">Modern tools to strengthen your referral network and practice growth.</p>
  </div>
</body></html>`,
    back_html: `<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;width:4.25in;height:6.25in;font-family:Helvetica,Arial,sans-serif;background:#ffffff;color:#0f172a;">
  <div style="padding:0.4in;width:2.1in;">
    <p style="margin:0 0 0.15in;font-size:12pt;font-weight:600;">Next step</p>
    <p style="margin:0 0 0.2in;font-size:10.5pt;line-height:1.45;">We would welcome a short conversation about opportunities that may fit your practice.</p>
    <p style="margin:0;font-size:10pt;color:#475569;">{{from_name}}</p>
  </div>
</body></html>`,
  },
  {
    id: 'builtin-coral-6x9',
    name: 'Warm highlight (6x9)',
    description: 'Larger postcard with warm accent band.',
    size: '6x9',
    front_html: `<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;width:6.25in;height:9.25in;font-family:Georgia,serif;background:#fff7ed;color:#1c1917;">
  <div style="height:1.1in;background:#ea580c;"></div>
  <div style="padding:0.55in 0.55in 0.4in;">
    <p style="margin:0;font-size:12pt;letter-spacing:0.1em;text-transform:uppercase;color:#9a3412;">{{from_name}}</p>
    <h1 style="margin:0.3in 0 0.25in;font-size:34pt;line-height:1.15;font-weight:normal;">Designed for practices like yours</h1>
    <p style="margin:0;font-size:15pt;line-height:1.5;max-width:4.8in;">Hello {{name}}, discover partnership opportunities built for Florida healthcare providers.</p>
  </div>
</body></html>`,
    back_html: `<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;width:6.25in;height:9.25in;font-family:Georgia,serif;background:#ffffff;color:#1c1917;">
  <div style="padding:0.5in;width:3.2in;">
    <p style="margin:0 0 0.2in;font-size:16pt;">{{name}},</p>
    <p style="margin:0 0 0.25in;font-size:12pt;line-height:1.5;">Thank you for the work you do. We would like to share opportunities that may benefit your practice.</p>
    <p style="margin:0;font-size:11pt;line-height:1.45;color:#57534e;">{{from_name}}<br/>{{from_address}}</p>
  </div>
</body></html>`,
  },
];

export function getBuiltInPostcardTemplate(id: string): BuiltInPostcardTemplate | undefined {
  return BUILT_IN_POSTCARD_TEMPLATES.find((t) => t.id === id);
}
