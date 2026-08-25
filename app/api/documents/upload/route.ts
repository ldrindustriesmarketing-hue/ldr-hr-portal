import { NextRequest, NextResponse } from 'next/server';
import { supabaseForRequest } from '@/lib/supabaseServer';

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

  if (!response.ok) {
    throw new Error('Failed to get SharePoint token');
  }

  const data = await response.json();
  return data.access_token;
}

async function uploadToSharePoint(file: File, fileName: string) {
  try {
    const token = await getSharePointToken();

    const siteName = process.env.SHAREPOINT_SITE_NAME;
    const siteId = process.env.SHAREPOINT_SITE_ID;

    const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${siteName}.sharepoint.com:/sites/${siteId}:/drive/root:/%5B03-09-01%20Policies%5D/${fileName}:/content`;

    const arrayBuffer = await file.arrayBuffer();

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: arrayBuffer
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.text();
      console.error('SharePoint upload error:', errorData);
      throw new Error(`SharePoint upload failed: ${uploadResponse.status}`);
    }

    const uploadedFile = await uploadResponse.json();
    return uploadedFile.webUrl;
  } catch (err) {
    console.error('SharePoint upload error:', err);
    throw err;
  }
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

    if (!title) {
      return NextResponse.json({ error: 'No title provided' }, { status: 400 });
    }

    console.log(`Uploading file: ${file.name} to SharePoint`);

    const sharePointUrl = await uploadToSharePoint(file, file.name);

    console.log(`File uploaded to SharePoint: ${sharePointUrl}`);

    const supabase = supabaseForRequest(request);
    const { data, error } = await supabase
      .from('documents')
      .insert({
        title,
        description: description || null,
        sharepoint_url: sharePointUrl,
        file_name: file.name,
        uploaded_by: userId,
        uploaded_by_name: userName
      })
      .select();

    if (error) {
      console.error('Database insert error:', error);
      throw error;
    }

    return NextResponse.json({ success: true, document: data[0] });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed: ' + String(err) }, { status: 500 });
  }
}