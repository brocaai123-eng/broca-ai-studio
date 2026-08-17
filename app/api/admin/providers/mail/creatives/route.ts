import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, adminSupabase } from '@/lib/admin-auth';
import {
  LOB_POSTCARD_ARTBOARD,
  LOB_POSTCARD_SIZES,
  parsePostcardSize,
  type LobPostcardSize,
} from '@/lib/mail/lob';
import { BUILT_IN_POSTCARD_TEMPLATES } from '@/lib/mail/postcard-templates';

export const maxDuration = 60;

const BUCKET = 'postcard-creatives';
const MAX_BYTES = 12 * 1024 * 1024; // 12MB
const ALLOWED = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
]);

async function ensureBucket() {
  const { data: buckets } = await adminSupabase.storage.listBuckets();
  const exists = (buckets || []).some((b) => b.name === BUCKET || b.id === BUCKET);
  if (!exists) {
    const { error } = await adminSupabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf'],
    });
    if (error && !/already exists|duplicate/i.test(error.message)) {
      throw new Error(`Storage bucket error: ${error.message}`);
    }
  }
}

function publicUrlFor(path: string): string {
  const { data } = adminSupabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** List built-in + saved postcard templates; return size artboard helpers. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  let saved: unknown[] = [];
  try {
    const { data, error } = await adminSupabase
      .from('postcard_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error) saved = data || [];
  } catch {
    /* table may not exist yet */
  }

  return NextResponse.json({
    sizes: LOB_POSTCARD_SIZES.map((size) => ({
      size,
      artboard: LOB_POSTCARD_ARTBOARD[size],
    })),
    built_in: BUILT_IN_POSTCARD_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      size: t.size,
      front_html: t.front_html,
      back_html: t.back_html,
      source: 'builtin' as const,
    })),
    saved,
  });
}

/**
 * Upload front/back creatives (multipart) or save URL/HTML template (JSON).
 *
 * Multipart fields: front (file), back (file), size, name?
 * JSON body: { name, size, front_url?, back_url?, front_html?, back_html?, save?: boolean }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const contentType = request.headers.get('content-type') || '';

  try {
    if (contentType.includes('multipart/form-data')) {
      await ensureBucket();
      const form = await request.formData();
      const size = parsePostcardSize(form.get('size'));
      const name = String(form.get('name') || `Upload ${size}`).slice(0, 120);
      const save = String(form.get('save') || '') === '1' || String(form.get('save') || '') === 'true';

      const frontFile = form.get('front');
      const backFile = form.get('back');
      if (!(frontFile instanceof File)) {
        return NextResponse.json(
          { error: 'Upload a front design (PDF, PNG, or JPG). Back is optional.' },
          { status: 400 },
        );
      }

      const frontUrl = await uploadSide(frontFile, auth.userId!, 'front', size);
      const backUrl =
        backFile instanceof File
          ? await uploadSide(backFile, auth.userId!, 'back', size)
          : frontUrl;

      let templateId: string | null = null;
      if (save) {
        templateId = await saveTemplateRow({
          userId: auth.userId!,
          name,
          size,
          front_url: frontUrl,
          back_url: backUrl,
        });
      }

      return NextResponse.json({
        ok: true,
        size,
        artboard: LOB_POSTCARD_ARTBOARD[size],
        front_url: frontUrl,
        back_url: backUrl,
        template_id: templateId,
      });
    }

    const body = await request.json();
    const size = parsePostcardSize(body.size);
    const name = String(body.name || `Creative ${size}`).slice(0, 120);
    const front_url = body.front_url ? String(body.front_url).trim() : null;
    const back_url = body.back_url ? String(body.back_url).trim() : null;
    const front_html = body.front_html ? String(body.front_html) : null;
    const back_html = body.back_html ? String(body.back_html) : null;

    if (!front_url && !front_html) {
      return NextResponse.json({ error: 'Provide front_url or front_html' }, { status: 400 });
    }
    if (!back_url && !back_html) {
      return NextResponse.json({ error: 'Provide back_url or back_html' }, { status: 400 });
    }

    let templateId: string | null = null;
    if (body.save) {
      templateId = await saveTemplateRow({
        userId: auth.userId!,
        name,
        size,
        front_url,
        back_url,
        front_html,
        back_html,
        description: body.description ? String(body.description).slice(0, 300) : null,
      });
    }

    return NextResponse.json({
      ok: true,
      size,
      artboard: LOB_POSTCARD_ARTBOARD[size],
      front_url,
      back_url,
      front_html,
      back_html,
      template_id: templateId,
    });
  } catch (e: any) {
    console.error('[admin/providers/mail/creatives]', e);
    return NextResponse.json({ error: e?.message || 'Creative upload failed' }, { status: 500 });
  }
}

async function uploadSide(
  file: File,
  userId: string,
  side: 'front' | 'back',
  size: LobPostcardSize,
): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error(`${side} file exceeds 12MB limit`);
  }
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const looksAllowed =
    ALLOWED.has(mime) ||
    mime === 'image/jpg' ||
    !mime && (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.pdf'));
  if (mime && !ALLOWED.has(mime) && mime !== 'image/jpg' && !looksAllowed) {
    throw new Error(`${side} must be PDF, PNG, or JPG`);
  }
  const ext =
    mime.includes('pdf') || name.endsWith('.pdf')
      ? 'pdf'
      : mime.includes('png') || name.endsWith('.png')
        ? 'png'
        : 'jpg';
  const path = `${userId}/${size}/${Date.now()}-${side}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await adminSupabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: mime || (ext === 'pdf' ? 'application/pdf' : `image/${ext}`),
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return publicUrlFor(path);
}

async function saveTemplateRow(opts: {
  userId: string;
  name: string;
  size: LobPostcardSize;
  front_url?: string | null;
  back_url?: string | null;
  front_html?: string | null;
  back_html?: string | null;
  description?: string | null;
}): Promise<string | null> {
  try {
    const { data, error } = await adminSupabase
      .from('postcard_templates')
      .insert({
        created_by: opts.userId,
        name: opts.name,
        description: opts.description || null,
        size: opts.size,
        front_url: opts.front_url || null,
        back_url: opts.back_url || null,
        front_html: opts.front_html || null,
        back_html: opts.back_html || null,
      })
      .select('id')
      .single();
    if (error) {
      console.warn('[postcard_templates] save skipped:', error.message);
      return null;
    }
    return data?.id || null;
  } catch (e: any) {
    console.warn('[postcard_templates] save skipped:', e?.message);
    return null;
  }
}
