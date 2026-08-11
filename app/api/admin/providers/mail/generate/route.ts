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

    const topicLine = topic
      ? `Topic / offer to emphasize: ${topic}`
      : 'Topic: general practice partnership / growth opportunities with BrocaAI.';

    if (mode === 'design_html' || body.design_html === true) {
      const dims =
        size === '6x9'
          ? '6.25in wide × 9.25in tall'
          : size === '6x11'
            ? '6.25in wide × 11.25in tall'
            : '4.25in wide × 6.25in tall';

      const system = `You are a direct-mail HTML designer for Lob postcards (WebKit renderer).
Rules:
- Return ONLY valid JSON with keys "front_html" and "back_html" (full HTML documents).
- Use inline CSS only (no external stylesheets, no JS, no web fonts @import).
- Include exact placeholder {{name}} on the front at least once.
- Sign / brand as BrocaAI. Tone: ${tone}.
- No medical claims or guarantees. Do not invent phone numbers or URLs unless given in the topic.
- Body width/height must match ${dims} (include bleed size as width/height on body).
- Front: full-bleed marketing layout (gradients, shapes via CSS ok). Make it look designed, not plain text.
- Back: keep LEFT ~half for message; leave BOTTOM-RIGHT region visually empty for Lob address/postage (ink-free zone). Do not place critical text in the bottom-right quadrant.
- Prefer CSS gradients and solid colors over remote images (remote images may fail print).`;

      const userPrompt = `${topicLine}
Postcard size: ${size} (${dims})
Recipient context example: ${sampleName}

Return JSON:
{ "front_html": "<html>...</html>", "back_html": "<html>...</html>" }`;

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
      if (!front_html.includes('{{name}}')) {
        front_html = front_html.replace(
          /<body([^>]*)>/i,
          `<body$1><div style="padding:12px;font-family:Georgia,serif;">Hello {{name}},</div>`,
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

    const system = `You write short outreach copy for US healthcare providers (NPI directory).
Rules:
- Plain text only (no HTML, no markdown).
- Always include the exact placeholder {{name}} where the recipient name goes (never invent a real name).
- Sign as BrocaAI.
- Tone: ${tone}, respectful, not spammy, no medical claims, no guarantees.
- Do not invent phone numbers, URLs, or addresses unless the user provided them in the topic.`;

    const userPrompt =
      mailType === 'postcard'
        ? `${topicLine}
Recipient context example: ${sampleName}

Return ONLY valid JSON with keys "front" and "back" (strings).
- front: 2–4 short lines for postcard front (under ~350 characters). Include {{name}} once.
- back: 2–4 short lines for postcard back (CTA + BrocaAI sign-off, under ~280 characters). May include {{name}}.`
        : `${topicLine}
Recipient context example: ${sampleName}

Return ONLY valid JSON with key "message" (string).
Write a short physical letter body (about 80–140 words):
- Greeting with {{name}}
- 1–2 short paragraphs
- Clear soft CTA
- Closing signed BrocaAI
Keep line breaks as \\n in the JSON string.`;

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
    if (!message.includes('{{name}}')) {
      message = `Hello {{name}},\n\n${message}`;
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
