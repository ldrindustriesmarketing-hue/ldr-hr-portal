'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface HazardReport {
  id: string;
  hazard_name: string;
  hazard_site: string;
  location: string;
  description: string;
  image_data: string | null;
  status: string;
  manager_notes: string | null;
  manager_updated_at: string | null;
  created_at: string;
  submitted_by: string;
  employee_name?: string;
}

export default function AllReportsPage() {
  const [user, setUser] = useState<any>(null);
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<{ [key: string]: string }>({});
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'manager' && parsedUser.role !== 'admin') {
      router.push('/dashboard/employee');
      return;
    }
    setUser(parsedUser);
    fetchAllReports();
  }, [router]);

  async function fetchAllReports() {
    try {
      const { data, error } = await supabase
        .from('hazard_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const reportsWithNames = await Promise.all(
        (data || []).map(async (report) => {
          const { data: empData } = await supabase
            .from('employees')
            .select('name')
            .eq('id', report.submitted_by)
            .single();
          return {
            ...report,
            employee_name: empData?.name || 'Unknown'
          };
        })
      );

      setReports(reportsWithNames);
      const notesMap: { [key: string]: string } = {};
      reportsWithNames.forEach((report) => {
        notesMap[report.id] = report.manager_notes || '';
      });
      setNoteText(notesMap);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatusAndNotes(reportId: string, newStatus: string) {
    setUpdatingId(reportId);
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('hazard_reports')
        .update({ 
          status: newStatus,
          manager_notes: noteText[reportId] || null,
          manager_updated_at: now
        })
        .eq('id', reportId);

      if (error) throw error;

      setReports(
        reports.map((report) =>
          report.id === reportId 
            ? { 
                ...report, 
                status: newStatus,
                manager_notes: noteText[reportId] || null,
                manager_updated_at: now
              } 
            : report
        )
      );
    } catch (err) {
      alert('Failed to update report');
      console.error(err);
    } finally {
      setUpdatingId(null);
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

  const filteredReports =
    filterStatus === 'all'
      ? reports
      : reports.filter((report) => report.status === filterStatus);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.push('/dashboard/manager')}
          className="mb-6 text-gray-600 hover:text-gray-800 flex items-center"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold mb-2" style={{ color: '#f89939' }}>All Hazard Reports</h1>
        <p className="text-gray-600 mb-6">Manage all employee hazard reports</p>

        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <label className="text-gray-700 font-semibold mr-4">Filter by Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Reports</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <span className="ml-4 text-gray-600">
            Showing {filteredReports.length} of {reports.length} reports
          </span>
        </div>

        {filteredReports.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-600">No reports found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div key={report.id} className="bg-white rounded-lg shadow">
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50"
                  onClick={() => 
                    setExpandedReportId(
                      expandedReportId === report.id ? null : report.id
                    )
                  }
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-800">
                        {report.hazard_name}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Reported by: <span className="font-semibold">{report.employee_name}</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(report.created_at)}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                        report.status
                      )}`}
                    >
                      {report.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">Site</p>
                      <p className="text-gray-700">{report.hazard_site}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">Location</p>
                      <p className="text-gray-700">{report.location}</p>
                    </div>
                  </div>
                </div>

                {expandedReportId === report.id && (
                  <div className="border-t p-6 bg-gray-50">
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 font-semibold uppercase mb-2">
                        Description
                      </p>
                      <p className="text-gray-700">{report.description}</p>
                    </div>

                    {report.image_data && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 font-semibold uppercase mb-2">
                          Photo
                        </p>
                        <img
                          src={report.image_data}
                          alt="Hazard photo"
                          className="max-w-sm h-auto rounded-lg border border-gray-300"
                        />
                      </div>
                    )}

                    <div className="mb-4 pt-4 border-t">
                      <label className="text-gray-700 font-semibold block mb-2">
                        Update Status:
                      </label>
                      <select
                        value={report.status}
                        onChange={(e) => updateStatusAndNotes(report.id, e.target.value)}
                        disabled={updatingId === report.id}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-orange-500"
                      >
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under Review</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="text-gray-700 font-semibold block mb-2">
                        Manager Notes:
                      </label>
                      <textarea
                        value={noteText[report.id] || ''}
                        onChange={(e) => 
                          setNoteText({
                            ...noteText,
                            [report.id]: e.target.value
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-orange-500"
                        placeholder="Add notes about actions taken, follow-up required, etc..."
                        rows={4}
                        disabled={updatingId === report.id}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {noteText[report.id]?.length || 0} characters
                      </p>
                    </div>

                    {report.manager_updated_at && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-600">
                          <span className="font-semibold">Last Updated:</span> {formatDate(report.manager_updated_at)}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() => updateStatusAndNotes(report.id, report.status)}
                      disabled={updatingId === report.id}
                      style={{ backgroundColor: '#f89939' }}
                      className="text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      {updatingId === report.id ? 'Saving...' : 'Save Changes'}
                    </button>

                    <div className="text-xs text-gray-500 mt-4 pt-4 border-t">
                      Report ID: {report.id.substring(0, 8)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}