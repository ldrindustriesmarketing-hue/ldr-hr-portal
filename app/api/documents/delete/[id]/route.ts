import { NextRequest, NextResponse } from 'next/server';
import { supabaseForRequest } from '@/lib/supabaseServer';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'No document id provided' }, { status: 400 });
    }

    // Removes the catalog entry from Supabase. The underlying file stays in
    // SharePoint (deleting it there would require Graph API delete calls
    // with the same app credentials the upload route uses).
    const supabase = supabaseForRequest(request);
    const { error } = await supabase.from('documents').delete().eq('id', id);

    if (error) {
      console.error('Database delete error:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    return NextResponse.json({ error: 'Delete failed: ' + String(err) }, { status: 500 });
  }
}
