'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

interface Incident {
  id: string;
  incident_date: string;
  location: string;
  what_happened: string;
  injuries: boolean;
  injuries_description: string;
  first_aid_given: boolean;
  other_persons_involved: string;
  witnesses: string;
  site_made_safe: boolean;
  safety_notes: string;
  status: string;
  created_at: string;
}

export default function AllIncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
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

    fetchIncidents();
  }, [router]);

  async function fetchIncidents() {
    try {
      setLoading(true);
      let query = supabase.from('incident_reports').select('*').order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setIncidents(data || []);
    } catch (err) {
      console.error('Error fetching incidents:', err);
    } finally {
      setLoading(false);
    }
  }

  async function expandIncident(incidentId: string) {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    await logAudit(
      'report_viewed',
      userData.id,
      incidentId,
      'incident_report',
      { action: 'manager_viewed', timestamp: new Date().toISOString() }
    );
    setExpandedId(expandedId === incidentId ? null : incidentId);
  }

  async function updateStatus(id: string, newStatus: string) {
    try {
      const { error } = await supabase.from('incident_reports').update({ status: newStatus }).eq('id', id);

      if (error) throw error;
      await fetchIncidents();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>Incident Reports</h1>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <label className="block text-gray-700 font-semibold mb-2">Filter by Status</label>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); fetchIncidents(); }} className="px-4 py-2 border rounded-lg text-black">
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {loading ? (
            <p className="text-gray-600">Loading incidents...</p>
          ) : incidents.length === 0 ? (
            <p className="text-gray-600">No incident reports found</p>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div key={incident.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">Incident on {new Date(incident.incident_date).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-600">Location: {incident.location}</p>
                      <p className="text-sm text-gray-600">Submitted: {new Date(incident.created_at).toLocaleDateString()}</p>
                      <span className={`text-xs font-bold px-2 py-1 rounded mt-2 inline-block ${incident.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' : incident.status === 'under_review' ? 'bg-blue-100 text-blue-800' : incident.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {incident.status.toUpperCase()}
                      </span>
                    </div>
                    <button onClick={() => expandIncident(incident.id)} className="text-gray-600 hover:text-gray-800 font-semibold">
                      {expandedId === incident.id ? '▼' : '▶'}
                    </button>
                  </div>

                  {expandedId === incident.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div>
                        <p className="font-semibold text-gray-700">What Happened</p>
                        <p className="text-gray-600">{incident.what_happened}</p>
                      </div>

                      <div>
                        <p className="font-semibold text-gray-700">Injuries: {incident.injuries ? '✓ Yes' : '✗ No'}</p>
                        {incident.injuries && incident.injuries_description && (
                          <p className="text-gray-600">{incident.injuries_description}</p>
                        )}
                      </div>

                      <div>
                        <p className="font-semibold text-gray-700">First Aid Given: {incident.first_aid_given ? '✓ Yes' : '✗ No'}</p>
                      </div>

                      {incident.other_persons_involved && (
                        <div>
                          <p className="font-semibold text-gray-700">Others Involved</p>
                          <p className="text-gray-600">{incident.other_persons_involved}</p>
                        </div>
                      )}

                      {incident.witnesses && (
                        <div>
                          <p className="font-semibold text-gray-700">Witnesses</p>
                          <p className="text-gray-600">{incident.witnesses}</p>
                        </div>
                      )}

                      <div>
                        <p className="font-semibold text-gray-700">Site Made Safe: {incident.site_made_safe ? '✓ Yes' : '✗ No'}</p>
                      </div>

                      {incident.safety_notes && (
                        <div>
                          <p className="font-semibold text-gray-700">Safety Notes</p>
                          <p className="text-gray-600">{incident.safety_notes}</p>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t">
                        <label className="block text-gray-700 font-semibold mb-2">Update Status</label>
                        <select value={incident.status} onChange={(e) => updateStatus(incident.id, e.target.value)} className="px-4 py-2 border rounded-lg text-black">
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