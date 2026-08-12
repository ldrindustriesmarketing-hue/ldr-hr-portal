'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

interface Report {
  id: string;
  hazard_name: string;
  location: string;
  severity: string;
  status: string;
  created_at: string;
}

export default function MyReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    logAudit(
      'reports_viewed',
      user.id,
      user.id,
      'my_reports',
      { timestamp: new Date().toISOString() }
    );

    fetchReports(user.id);
  }, [router]);

  async function fetchReports(userId: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('hazard_reports')
        .select('*')
        .eq('submitted_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>My Reports</h1>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {loading ? (
            <p className="text-gray-600">Loading reports...</p>
          ) : reports.length === 0 ? (
            <p className="text-gray-600">You haven't submitted any reports yet</p>
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