'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface AuditLog {
  id: string;
  action: string;
  actor_id: string;
  subject_id: string;
  subject_type: string;
  details: any;
  timestamp: string;
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchAuditLogs();
  }, [router]);

  async function fetchAuditLogs() {
    try {
      setLoading(true);
      let query = supabase.from('audit_trail').select('*').order('timestamp', { ascending: false }).limit(500);

      if (filterAction !== 'all') {
        query = query.eq('action', filterAction);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }

  const actions = ['all', 'report_submitted', 'assessment_created', 'assessment_assigned', 'assessment_signed', 'status_updated', 'document_uploaded'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>Audit Trail</h1>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <label className="block text-gray-700 font-semibold mb-2">Filter by Action</label>
          <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); fetchAuditLogs(); }} className="px-4 py-2 border rounded-lg text-black">
            {actions.map((action) => (
              <option key={action} value={action}>{action === 'all' ? 'All Actions' : action.replace(/_/g, ' ').toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#f89939' }}>Activity Log</h2>

          {loading ? (
            <p className="text-gray-600">Loading audit trail...</p>
          ) : logs.length === 0 ? (
            <p className="text-gray-600">No activity found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Timestamp</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-800">{log.action.replace(/_/g, ' ').toUpperCase()}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{log.subject_type}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{log.details?.message || log.details?.status || JSON.stringify(log.details).substring(0, 50)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}