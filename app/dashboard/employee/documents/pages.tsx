'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Document {
  id: string;
  title: string;
  description: string;
  file_name: string;
  uploaded_by_name: string;
  created_at: string;
  sharepoint_url: string;
}

export default function EmployeeDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
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
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>
            HR Documents
          </h1>
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800 font-semibold"
          >
            ← Back
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {loading ? (
            <p className="text-gray-600">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="text-gray-600">No documents available</p>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{doc.title}</h3>
                      {doc.description && (
                        <p className="text-gray-600 text-sm mt-1">{doc.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Uploaded by: {doc.uploaded_by_name} • {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                      href={doc.sharepoint_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ backgroundColor: '#f89939' }}
                      className="px-4 py-2 text-white rounded-lg text-sm font-semibold hover:opacity-90"
                    >
                      📄 View
                    </a>
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