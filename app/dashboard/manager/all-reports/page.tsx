'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

interface Report {
  id: string;
  hazard_name: string;
  location: string;
  description: string;
  severity: string | null;
  status: string | null;
  created_at: string;
}

export default function AllReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [imageCache, setImageCache] = useState<Record<string, string>>({});
  const [imageLoadingId, setImageLoadingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchReports();
  }, [router]);

  async function fetchReports() {
    try {
      setLoading(true);
      let query = supabase
        .from('hazard_reports')
        .select('id, hazard_name, location, description, severity, status, created_at')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleFilter(status: string) {
    setFilterStatus(status);
  }

  async function toggleExpand(id: string) {
    const opening = expandedId !== id;
    setExpandedId(opening ? id : null);

    if (opening && !(id in imageCache)) {
      setImageLoadingId(id);
      try {
        const { data } = await supabase.from('hazard_reports').select('image_data').eq('id', id).single();
        setImageCache((prev) => ({ ...prev, [id]: data?.image_data || '' }));
      } catch (err) {
        console.error('Error fetching report photo:', err);
      } finally {
        setImageLoadingId(null);
      }
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    try {
      const { error } = await supabase.from('hazard_reports').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      await fetchReports();
    } catch (err) {
      console.error('Error updating:', err);
    }
  }

  async function handleDelete(report: Report) {
    if (!confirm(`Delete this hazard report ("${report.hazard_name}")? This cannot be undone.`)) return;

    try {
      const { error } = await supabase.from('hazard_reports').delete().eq('id', report.id);
      if (error) throw error;

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      await logAudit('report_deleted', userData.id, report.id, 'hazard_report', { hazard_name: report.hazard_name });

      await fetchReports();
    } catch (err) {
      console.error('Error deleting report:', err);
      alert('Failed to delete report');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8" style={{ color: '#f89939' }}>Hazard Reports</h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <label className="block text-gray-700 font-semibold mb-2">Filter by Status</label>
          <select value={filterStatus} onChange={(e) => handleFilter(e.target.value)} className="px-4 py-2 border rounded-lg text-black">
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {loading ? (
            <p className="text-gray-600">Loading...</p>
          ) : reports.length === 0 ? (
            <p className="text-gray-600">No reports found</p>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold">{report.hazard_name}</p>
                      <p className="text-sm text-gray-600">Location: {report.location}</p>
                      <p className="text-sm text-gray-600">{new Date(report.created_at).toLocaleDateString()}</p>
                      <div className="flex gap-2 mt-2">
                        {report.severity && (
                          <span className={`text-xs font-bold px-2 py-1 rounded ${report.severity === 'high' ? 'bg-red-100 text-red-800' : report.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                            {report.severity.toUpperCase()}
                          </span>
                        )}
                        {report.status && (
                          <span className={`text-xs font-bold px-2 py-1 rounded ${report.status === 'submitted' ? 'bg-blue-100 text-blue-800' : report.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' : report.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {report.status.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => toggleExpand(report.id)} className="font-semibold">
                      {expandedId === report.id ? '▼' : '▶'}
                    </button>
                  </div>

                  {expandedId === report.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <p><strong>Description:</strong> {report.description}</p>
                      {report.severity && <p><strong>Severity:</strong> {report.severity}</p>}
                      {report.status && <p><strong>Status:</strong> {report.status}</p>}

                      {imageLoadingId === report.id ? (
                        <p className="text-gray-500 text-sm">Loading photo...</p>
                      ) : imageCache[report.id] ? (
                        <div>
                          <p className="font-semibold mb-2">Photo</p>
                          <img src={imageCache[report.id]} alt="Report" className="max-w-sm rounded" />
                        </div>
                      ) : null}

                      <div>
                        <label className="block font-semibold mb-2">Update Status</label>
                        <select value={report.status || 'submitted'} onChange={(e) => updateStatus(report.id, e.target.value)} className="px-4 py-2 border rounded text-black">
                          <option value="submitted">Submitted</option>
                          <option value="under_review">Under Review</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>

                      <div className="pt-2">
                        <button onClick={() => handleDelete(report)} className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:opacity-90 text-sm">🗑️ Delete Report</button>
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