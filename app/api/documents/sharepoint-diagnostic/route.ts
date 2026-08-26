import { NextRequest, NextResponse } from 'next/server';
import { supabaseForRequest } from '@/lib/supabaseServer';

// TEMPORARY diagnostic route for tracking down the SharePoint Graph API
// config issue. Manager-only. Safe to delete once upload works.

async function getSharePointToken() {
  const tokenUrl = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID || '',
    client_secret: process.env.AZURE_CLIENT_SECRET || '',
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const response = await fetch(tokenUrl, { method: 'POST', body });
  if (!response.ok) {
    throw new Error(`token fetch failed: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  return data.access_token as string;
}

async function tryGet(label: string, url: string, token: string) {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {}
    return {
      label,
      url,
      status: res.status,
      ok: res.ok,
      summary: res.ok
        ? { id: parsed?.id, name: parsed?.name || parsed?.displayName, webUrl: parsed?.webUrl, value_count: Array.isArray(parsed?.value) ? parsed.value.length : undefined }
        : (parsed?.error?.message || text).slice(0, 300),
    };
  } catch (err) {
    return { label, url, status: null, ok: false, summary: String(err) };
  }
}

export async function GET(request: NextRequest) {
  const supabase = supabaseForRequest(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: employee } = await supabase.from('employees').select('role').eq('auth_user_id', user.id).single();
  if (!employee || !['manager', 'admin'].includes(employee.role)) {
    return NextResponse.json({ error: 'Manager access required' }, { status: 403 });
  }

  try {
    const token = await getSharePointToken();
    const siteName = process.env.SHAREPOINT_SITE_NAME;
    const siteId = process.env.SHAREPOINT_SITE_ID;

    const results = await Promise.all([
      tryGet('tenant root site', `https://graph.microsoft.com/v1.0/sites/root`, token),
      tryGet('hostname only', `https://graph.microsoft.com/v1.0/sites/${siteName}.sharepoint.com`, token),
      tryGet('hostname:/sites/{siteId} (no trailing colon)', `https://graph.microsoft.com/v1.0/sites/${siteName}.sharepoint.com:/sites/${siteId}`, token),
      tryGet('hostname:/sites/{siteId}: (trailing colon)', `https://graph.microsoft.com/v1.0/sites/${siteName}.sharepoint.com:/sites/${siteId}:`, token),
      tryGet('all sites search by siteId as term', `https://graph.microsoft.com/v1.0/sites?search=${encodeURIComponent(siteId || '')}`, token),
      tryGet('site by id directly (if siteId is a Graph site id/GUID)', `https://graph.microsoft.com/v1.0/sites/${siteId}`, token),
    ]);

    return NextResponse.json({
      env_present: { SHAREPOINT_SITE_NAME: !!siteName, SHAREPOINT_SITE_ID: !!siteId },
      results,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
