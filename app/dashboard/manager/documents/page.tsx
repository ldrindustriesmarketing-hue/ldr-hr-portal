'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Document {
  id: string;
  title: string;
  description: string;
  file_name: string;
  uploaded_by_name: string;
  created_at: string;
  sharepoint_url: string;
}

export default function ManagerDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchDocuments();
  }, [router]);

  async function fetchDocuments() {
    try {
      setLoading(true);
      const response = await fetch('/api/documents/list');
      const data = await response.json();
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!file || !title) {
      setError('Please select a file and enter a title');
      return;
    }

    try {
      setUploading(true);
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('userId', userData.id);
      formData.append('userName', userData.name);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      setTitle('');
      setDescription('');
      setFile(null);
      await fetchDocuments();
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload document');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this document?')) return;

    try {
      const response = await fetch(`/api/documents/delete/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      await fetchDocuments();
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete document');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>HR Documents</h1>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#f89939' }}>Upload Document</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Document Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="e.g., Company Policy 2024" disabled={uploading} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Description (Optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="Brief description" rows={3} disabled={uploading} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Select File</label>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full px-4 py-2 border rounded-lg" disabled={uploading} />
            </div>

            <button type="submit" disabled={uploading} style={{ backgroundColor: '#f89939' }} className="w-full text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50">
              {uploading ? '⬆️ Uploading...' : '⬆️ Upload Document'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#f89939' }}>All Documents</h2>

          {loading ? (
            <p className="text-gray-600">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="text-gray-600">No documents uploaded yet</p>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{doc.title}</h3>
                      {doc.description && <p className="text-gray-600 text-sm mt-1">{doc.description}</p>}
                      <p className="text-xs text-gray-500 mt-2">Uploaded by: {doc.uploaded_by_name} • {new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <a href={doc.sharepoint_url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#f89939' }} className="px-4 py-2 text-white rounded-lg text-sm font-semibold hover:opacity-90">📄 View</a>
                      <button onClick={() => handleDelete(doc.id)} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:opacity-90">🗑️ Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}