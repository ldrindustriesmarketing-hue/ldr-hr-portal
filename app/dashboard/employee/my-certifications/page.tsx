'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Certification {
  id: string;
  title: string;
  issuer: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: string;
}

function expiryInfo(expiryDate: string | null) {
  if (!expiryDate) return null;
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: 'Expired', color: 'bg-red-100 text-red-800' };
  if (days <= 30) return { label: `Expires in ${days}d`, color: 'bg-yellow-100 text-yellow-800' };
  return { label: 'Valid', color: 'bg-green-100 text-green-800' };
}

export default function MyCertificationsPage() {
  const [records, setRecords] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchRecords(JSON.parse(userData).id);
  }, [router]);

  async function fetchRecords(userId: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('certifications')
        .select('id, title, issuer, issue_date, expiry_date, status')
        .eq('employee_id', userId)
        .order('issue_date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching certifications:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>My Certifications</h1>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {loading ? (
            <p className="text-gray-600">Loading certifications...</p>
          ) : records.length === 0 ? (
            <p className="text-gray-600">No certifications recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {records.map((r) => {
                const expiry = expiryInfo(r.expiry_date);
                return (
                  <div key={r.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-800">{r.title}</p>
                      <p className="text-sm text-gray-600">
                        {r.issuer ? `${r.issuer} · ` : ''}Issued {r.issue_date ? new Date(r.issue_date).toLocaleDateString() : '—'}
                        {r.expiry_date ? ` · Expires ${new Date(r.expiry_date).toLocaleDateString()}` : ''}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded inline-block ${r.status === 'signed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {r.status.toUpperCase()}
                        </span>
                        {expiry && <span className={`text-xs font-bold px-2 py-1 rounded inline-block ${expiry.color}`}>{expiry.label}</span>}
                      </div>
                    </div>
                    {r.status === 'pending' ? (
                      <a href={`/dashboard/employee/sign-record/${r.id}?type=certification`} style={{ backgroundColor: '#f89939' }} className="px-4 py-2 text-white rounded-lg font-semibold hover:opacity-90 text-sm whitespace-nowrap">Review & Sign</a>
                    ) : (
                      <a href={`/dashboard/employee/view-record/${r.id}?type=certification`} className="px-4 py-2 bg-gray-700 text-white rounded-lg font-semibold hover:opacity-90 text-sm whitespace-nowrap">View</a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
