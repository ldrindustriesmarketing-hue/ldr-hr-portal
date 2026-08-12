'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface NearMiss {
  id: string;
  submitted_by: string;
  what_could_have_happened: string;
  contributing_factors: string;
  location: string;
  image_data: string;
  status: string;
  created_at: string;
}

export default function AllNearMissPage() {
  const [nearMisses, setNearMisses] = useState<NearMiss[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchNearMisses();
  }, [router]);

  async function fetchNearMisses() {
    try {
      setLoading(true);
      let query = supabase.from('near_miss_reports').select('*').order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNearMisses(data || []);
    } catch (err) {
      console.error('Error fetching near-miss reports:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    try {
      const { error } = await supabase.from('near_miss_reports').update({ status: newStatus }).eq('id', id);

      if (error) throw error;
      await fetchNearMisses();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>Near-Miss Reports</h1>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <label className="block text-gray-700 font-semibold mb-2">Filter by Status</label>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); fetchNearMisses(); }} className="px-4 py-2 border rounded-lg text-black">
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {loading ? (
            <p className="text-gray-600">Loading near-miss reports...</p>
          ) : nearMisses.length === 0 ? (
            <p className="text-gray-600">No near-miss reports found</p>
          ) : (
            <div className="space-y-4">
              {nearMisses.map((report) => (
                <div key={report.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">Near-Miss Report</p>
                      <p className="text-sm text-gray-600">Location: {report.location}</p>
                      <p className="text-sm text-gray-600">Submitted: {new Date(report.created_at).toLocaleDateString()}</p>
                      <span className={`text-xs font-bold px-2 py-1 rounded mt-2 inline-block ${report.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' : report.status === 'under_review' ? 'bg-blue-100 text-blue-800' : report.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {report.status.toUpperCase()}
                      </span>
                    </div>
                    <button onClick={() => setExpandedId(expandedId === report.id ? null : report.id)} className="text-gray-600 hover:text-gray-800 font-semibold">
                      {expandedId === report.id ? '▼' : '▶'}
                    </button>
                  </div>

                  {expandedId === report.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div>
                        <p className="font-semibold text-gray-700">What Could Have Happened</p>
                        <p className="text-gray-600">{report.what_could_have_happened}</p>
                      </div>

                      <div>
                        <p className="font-semibold text-gray-700">Contributing Factors</p>
                        <p className="text-gray-600">{report.contributing_factors}</p>
                      </div>

                      {report.image_data && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-2">Photo</p>
                          <img src={report.image_data} alt="Report photo" className="max-w-sm rounded-lg" />
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t">
                        <label className="block text-gray-700 font-semibold mb-2">Update Status</label>
                        <select value={report.status} onChange={(e) => updateStatus(report.id, e.target.value)} className="px-4 py-2 border rounded-lg text-black">
                          <option value="submitted">Submitted</option>
                          <option value="under_review">Under Review</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}