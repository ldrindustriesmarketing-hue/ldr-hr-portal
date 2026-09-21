import { NextRequest, NextResponse } from 'next/server';
import { sendFollowUpEmail } from '@/lib/email';
import { supabaseForRequest } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseForRequest(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: manager } = await supabase.from('employees').select('name, role').eq('auth_user_id', user.id).single();
    if (!manager || !['manager', 'admin'].includes(manager.role)) {
      return NextResponse.json({ error: 'Manager access required' }, { status: 403 });
    }

    const { employeeEmail, employeeName, subject, message } = await request.json();

    if (!employeeEmail || !subject || !message) {
      return NextResponse.json({ error: 'Missing employeeEmail, subject, or message' }, { status: 400 });
    }

    const result = await sendFollowUpEmail(employeeEmail, employeeName || 'there', manager.name, subject, message);

    if (!result) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Follow-up email API error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
