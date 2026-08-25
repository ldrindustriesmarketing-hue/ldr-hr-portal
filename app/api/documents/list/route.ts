import { NextRequest, NextResponse } from 'next/server';
import { supabaseForRequest } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseForRequest(request);
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Error fetching documents:', err);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}