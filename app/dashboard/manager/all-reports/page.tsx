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
  severity: string;
  status: string;
  image_data: string;
  manager_notes: string;
  created_at: string;
}

export default function AllReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
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

    fetchReports();
  }, [router]);

  async function fetchReports() {
    try {
      setLoading(true);
      let query = supabase.from('hazard_reports').select('*').order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  }

  async function expandReport(reportId: string) {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    await logAudit(
      'report_viewed',
      userData.id,
      reportId,
      'hazard_report',
      { action: 'manager_viewed', timestamp: new Date().toISOString() }
    );
    setExpandedId(expandedId === reportId ? null : reportId);
  }

  async function updateStatus(id: string, newStatus: string) {
    try {
      const { error } = await supabase.from('hazard_reports').update({ status: newStatus }).eq('id', id);

      if (error) throw error;
      await fetchReports();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>Hazard Reports</h1>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <label className="block text-gray-700 font-semibold mb-2">Filter by Status</label>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); fetchReports(); }} className="px-4 py-2 border rounded-lg text-black">
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {loading ? (
            <p className="text-gray-600">Loading reports...</p>
          ) : reports.length === 0 ? (
            <p className="text-gray-600">No reports found</p>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{report.hazard_name}</p>
                      <p className="text-sm text-gray-600">Location: {report.location}</p>
                      <p className="text-sm text-gray-600">Submitted: {new Date(report.created_at).toLocaleDateString()}</p>
                      <div className="flex gap-2 mt-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${report.severity === 'high' ? 'bg-red-100 text-red-800' : report.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {report.severity.toUpperCase()}
                        </span>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${report.status === 'submitted' ? 'bg-blue-100 text-blue-800' : report.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' : report.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {report.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => expandReport(report.id)} className="text-gray-600 hover:text-gray-800 font-semibold">
                      {expandedId === report.id ? '▼' : '▶'}
                    </button>
                  </div>

                  {expandedId === report.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div>
                        <p className="font-semibold text-gray-700">Description</p>
                        <p className="text-gray-600">{report.description}</p>
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