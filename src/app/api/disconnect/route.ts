import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'; // make sure this points to the service client

export async function POST(req: Request) {
  try {
    const { user_id, slug } = await req.json();
    console.log('[disconnect] Deleting user:', { user_id, slug });

    if (!user_id || !slug) {
      return NextResponse.json({ error: 'Missing user_id or slug' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('room_users')
      .delete()
      .eq('user_id', user_id)
      .eq('slug', slug);

    if (error) {
      console.error('[disconnect] Deletion error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[disconnect] Unexpected error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
