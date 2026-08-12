'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

interface HazardReport {
  id: string;
  hazard_name: string;
  hazard_site: string;
  location: string;
  description: string;
  image_data: string | null;
  status: string;
  created_at: string;
}

export default function MyReportsPage() {
  const [user, setUser] = useState<any>(null);
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));
    fetchReports(JSON.parse(userData).id);
  }, [router]);

  async function fetchReports(userId: string) {
    try {
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

  function getStatusColor(status: string) {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/dashboard/employee')}
          className="mb-6 text-gray-600 hover:text-gray-800 flex items-center"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold mb-2" style={{ color: '#f89939' }}>My Reports</h1>
        <p className="text-gray-600 mb-6">All your submitted hazard reports</p>

        {reports.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-600 mb-4">You haven't submitted any hazard reports yet.</p>
            <button
              onClick={() => router.push('/dashboard/employee/report-hazard')}
              style={{ backgroundColor: '#f89939' }}
              className="text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90"
            >
              Submit Your First Report
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">{report.hazard_name}</h2>
                    <p className="text-sm text-gray-500">{formatDate(report.created_at)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(report.status)}`}>
                    {report.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase">Site</p>
                    <p className="text-gray-700">{report.hazard_site}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase">Location</p>
                    <p className="text-gray-700">{report.location}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Description</p>
                  <p className="text-gray-700">{report.description}</p>
                </div>

                {report.image_data && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Photo</p>
                    <img
                      src={report.image_data}
                      alt="Hazard photo"
                      className="max-w-sm h-auto rounded-lg border border-gray-300"
                    />
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500">Report ID: {report.id.substring(0, 8)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}