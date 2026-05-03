import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      listing_id,
      sender_id,
      sender_name,
      sender_email,
      sender_phone,
      message,
      broker_id,
    } = body;

    if (!message || !sender_email) {
      return NextResponse.json(
        { error: 'Message and sender email are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('contact_messages')
      .insert({
        listing_id: listing_id || null,
        sender_id: sender_id || null,
        sender_name: sender_name || null,
        sender_email,
        sender_phone: sender_phone || null,
        message,
        broker_id: broker_id || null,
        status: 'unread',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, message: data }, { status: 201 });
  } catch (error) {
    console.error('Contact message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
