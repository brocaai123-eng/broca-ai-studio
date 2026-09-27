import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAdmin } from '@/lib/admin-auth';
import { parsePostcardSize } from '@/lib/mail/lob';

export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate plain-text letter/postcard copy, or HTML postcard designs (design_html mode).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured' },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const mailType = body.mail_type === 'postcard' ? 'postcard' : 'letter';
    const mode = String(body.mode || (mailType === 'postcard' && body.design_html ? 'design_html' : 'copy'));
    const topic = String(body.topic || '').trim().slice(0, 500);
    const tone = String(body.tone || 'professional').slice(0, 40);
    const sampleName = String(body.sample_name || 'the provider').slice(0, 120);
    const size = parsePostcardSize(body.postcard_size || body.size);

    const fromName = String(body.from_name || 'Broca AI').trim().slice(0, 80) || 'Broca AI';
    const senderLine = `Always sign / brand the sender as "${fromName}". Prefer the placeholder {{from_name}} (and {{from_address}} when an address belongs) so print personalization fills "${fromName}". Do not invent other company names.`;
    const topicLine = topic
      ? `Topic / offer to emphasize: ${topic}`
      : 'Topic: general practice partnership / growth opportunities.';

    if (mode === 'rewrite_template') {
      const existingFront = String(body.front_html || '').trim();
      const existingBack = String(body.back_html || '').trim();
      if (!existingFront || !existingBack) {
        return NextResponse.json(
          { error: 'Load a template first so AI can rewrite its text.' },
          { status: 400 },
        );
      }

      const system = `You rewrite copy inside existing Lob postcard HTML templates.
Rules:
- Return ONLY valid JSON with keys "front_html" and "back_html".
- Keep the same HTML structure, inline styles, colors, layout, and dimensions.
- Change visible marketing text to match the topic.
- ${senderLine}
- Keep placeholders {{name}}, {{from_name}}, and {{from_address}} if they already exist.
- Keep the exact placeholder {{name}} wherever a recipient name belongs (do not invent real names).
- Tone: ${tone}. No medical claims or guarantees.
- Back: keep bottom-right visually clear for Lob address/postage.
- Do not add external CSS/JS or remote images.`;

      const userPrompt = `${topicLine}
Recipient context example: ${sampleName}

CURRENT FRONT HTML:
${existingFront.slice(0, 12000)}

CURRENT BACK HTML:
${existingBack.slice(0, 12000)}

Return updated front_html and back_html with new copy for the topic.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      let parsed: { front_html?: string; back_html?: string } = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 502 });
      }
      let front_html = String(parsed.front_html || '').trim();
      let back_html = String(parsed.back_html || '').trim();
      if (!front_html || !back_html) {
        return NextResponse.json({ error: 'AI did not return updated HTML' }, { status: 502 });
      }
      if (!front_html.includes('{{name}}')) {
        front_html = front_html.replace(/Hello [^,<]+/i, 'Hello {{name}}');
      }
      return NextResponse.json({
        mail_type: 'postcard',
        mode: 'rewrite_template',
        front_html,
        back_html,
      });
    }

    if (mode === 'design_html' || body.design_html === true) {
      const dims =
        size === '6x9'
          ? '9.25in wide × 6.25in tall (landscape — Lob 6x9)'
          : size === '6x11'
            ? '11.25in wide × 6.25in tall (landscape — Lob 6x11)'
            : '6.25in wide × 4.25in tall (landscape — Lob 4x6)';

      const system = `You are a direct-mail HTML designer for Lob postcards (WebKit renderer).
Rules:
- Return ONLY valid JSON with keys "front_html" and "back_html" (full HTML documents).
- Use inline CSS only (no external stylesheets, no JS, no web fonts via @import).
- Recipient greeting MUST use the exact placeholder {{name}} only — never write "@", "@{{name}}", or invent a real recipient name.
- ${senderLine} Put {{from_name}} (Broca AI) on the back near the message. Optional {{from_address}}.
- Tone: ${tone}. No medical claims or guarantees. Do not invent phone numbers or URLs unless given in the topic.
- Body width/height must match ${dims} (include bleed size as width/height on body).
- Front: full-bleed marketing layout (gradients/shapes via CSS ok). Substantial copy: bold headline + 2–3 short sentences (about 45–80 words total on front), not a one-liner.
- Back: LEFT ~55% for message — 2 paragraphs (~70–120 words) plus sign-off with {{from_name}}. Leave BOTTOM-RIGHT empty for Lob address/postage (ink-free zone). No critical text in the bottom-right quadrant.
- Prefer CSS gradients and solid colors over remote images.`;

      const userPrompt = `${topicLine}
Postcard size: ${size} (${dims})
Recipient context example (do not hardcode — use {{name}}): ${sampleName}

Return JSON:
{ "front_html": "<html>...</html>", "back_html": "<html>...</html>" }

Example greeting pattern on front: Hello {{name}}, — never Dear @…`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.75,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      let parsed: { front_html?: string; back_html?: string } = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 502 });
      }

      let front_html = String(parsed.front_html || '').trim();
      let back_html = String(parsed.back_html || '').trim();
      if (!front_html || !back_html) {
        return NextResponse.json({ error: 'AI did not return front_html/back_html' }, { status: 502 });
      }
      // Strip AI "@" mistakes before personalization
      const scrubAt = (html: string) =>
        html
          .replace(/@\{\{name\}\}/gi, '{{name}}')
          .replace(/Dear\s+@\s*/gi, 'Dear ')
          .replace(/Hello\s+@\s*/gi, 'Hello ');
      front_html = scrubAt(front_html);
      back_html = scrubAt(back_html);
      if (!front_html.includes('{{name}}')) {
        front_html = front_html.replace(
          /<body([^>]*)>/i,
          `<body$1><div style="padding:12px;font-family:Georgia,serif;">Hello {{name}},</div>`,
        );
      }
      if (!back_html.includes('{{from_name}}')) {
        back_html = back_html.replace(
          /<\/body>/i,
          `<div style="padding:0.35in;font-family:Georgia,serif;font-size:11pt;">{{from_name}}</div></body>`,
        );
      }

      return NextResponse.json({
        mail_type: 'postcard',
        mode: 'design_html',
        postcard_size: size,
        front_html,
        back_html,
      });
    }

    const system =
      mailType === 'letter'
        ? `You write physical US letter outreach for healthcare providers (NPI directory).
Rules:
- Plain text only (no HTML, no markdown).
- Always use the exact placeholders {{name}} (recipient) and {{from_name}} (sender — Broca AI). Never invent a real recipient name.
- ${senderLine}
- Tone: ${tone}, warm, professional, not spammy, no medical claims, no guarantees.
- Do not invent phone numbers, URLs, or street addresses unless the user provided them in the topic.
- Letters must be substantial (full page worth of readable copy), not a short email stub.`
        : `You write short outreach copy for US healthcare providers (NPI directory).
Rules:
- Plain text only (no HTML, no markdown).
- Always include the exact placeholder {{name}} where the recipient name goes (never invent a real name).
- ${senderLine}
- Tone: ${tone}, respectful, not spammy, no medical claims, no guarantees.
- Do not invent phone numbers, URLs, or addresses unless the user provided them in the topic.`;

    const userPrompt =
      mailType === 'postcard'
        ? `${topicLine}
Recipient context example: ${sampleName}

Return ONLY valid JSON with keys "front" and "back" (strings).
- front: 2–4 short lines for postcard front (under ~350 characters). Include {{name}} once.
- back: 2–4 short lines for postcard back (CTA + sender sign-off, under ~280 characters). May include {{name}} and {{from_name}}.`
        : `${topicLine}
Recipient context example: ${sampleName}

Return ONLY valid JSON with key "message" (string).
Write a full physical letter body of about 220–320 words (aim for ~250+; never under 180 words):
1. First line MUST be exactly: Dear {{name}},
2. Then 3–4 developed paragraphs (practice context, partnership value, a concrete soft offer, invitation to connect).
3. Soft CTA paragraph (no hard sell, no guarantees).
4. Closing MUST end exactly with:
Best regards,
{{from_name}}
Keep line breaks as \\n in the JSON string. Do not omit {{name}} or {{from_name}}.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: mailType === 'letter' ? 0.75 : 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    let parsed: { message?: string; front?: string; back?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 502 });
    }

    if (mailType === 'postcard') {
      const front = String(parsed.front || '').trim();
      const back = String(parsed.back || '').trim();
      if (!front || !back) {
        return NextResponse.json({ error: 'AI did not return front/back copy' }, { status: 502 });
      }
      const frontOut = front.includes('{{name}}') ? front : `Hello {{name}},\n\n${front}`;
      return NextResponse.json({ mail_type: 'postcard', mode: 'copy', front: frontOut, back });
    }

    let message = String(parsed.message || '').trim();
    if (!message) {
      return NextResponse.json({ error: 'AI did not return a message' }, { status: 502 });
    }
    // Normalize greeting + sign-off placeholders
    if (!/dear\s+\{\{name\}\}\s*,/i.test(message) && !message.includes('{{name}}')) {
      message = `Dear {{name}},\n\n${message}`;
    } else if (!message.includes('{{name}}')) {
      message = message.replace(/^dear\s*,?\s*/i, 'Dear {{name}},\n\n');
      if (!message.includes('{{name}}')) {
        message = `Dear {{name}},\n\n${message}`;
      }
    } else if (!/^dear\s+\{\{name\}\}\s*,/i.test(message.trim())) {
      // Has {{name}} somewhere but greeting is bare "Dear,"
      message = message.replace(/^dear\s*,\s*/i, 'Dear {{name}},\n\n');
    }
    if (!message.includes('{{from_name}}')) {
      message = message.replace(/\s*(best regards,?\s*)$/i, '');
      message = `${message.replace(/\s+$/, '')}\n\nBest regards,\n{{from_name}}`;
    } else if (!/best regards,?\s*\n\s*\{\{from_name\}\}/i.test(message)) {
      // Ensure from_name sits under the closing
      message = message.replace(/\s*\{\{from_name\}\}\s*$/i, '');
      message = message.replace(/\s*(best regards,?)\s*$/i, '');
      message = `${message.replace(/\s+$/, '')}\n\nBest regards,\n{{from_name}}`;
    }
    return NextResponse.json({ mail_type: 'letter', mode: 'copy', message });
  } catch (e: any) {
    console.error('[admin/providers/mail/generate]', e);
    return NextResponse.json(
      { error: e?.message || 'AI generate failed' },
      { status: 500 },
    );
  }
}
