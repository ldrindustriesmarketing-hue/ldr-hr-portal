import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get SharePoint access token
async function getSharePointToken() {
  const tokenUrl = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID || '',
    client_secret: process.env.AZURE_CLIENT_SECRET || '',
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    body: body
  });

  const data = await response.json();
  return data.access_token;
}

// Upload file to SharePoint
async function uploadToSharePoint(file: File, fileName: string) {
  const token = await getSharePointToken();

  const siteName = process.env.SHAREPOINT_SITE_NAME;
  const siteId = process.env.SHAREPOINT_SITE_ID;

  const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${siteName}.sharepoint.com:/sites/${siteId}:/drive/root:/HR%20Documents/${fileName}:/content`;

  const arrayBuffer = await file.arrayBuffer();

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': file.type
    },
    body: arrayBuffer
  });

  if (!uploadResponse.ok) {
    throw new Error('SharePoint upload failed');
  }

  const uploadedFile = await uploadResponse.json();
  return uploadedFile.webUrl;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const userId = formData.get('userId') as string;
    const userName = formData.get('userName') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload to SharePoint
    const sharePointUrl = await uploadToSharePoint(file, file.name);

    // Save metadata to Supabase
    const { data, error } = await supabase
      .from('documents')
      .insert({
        title,
        description,
        sharepoint_url: sharePointUrl,
        file_name: file.name,
        uploaded_by: userId,
        uploaded_by_name: userName
      })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, document: data[0] });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}   