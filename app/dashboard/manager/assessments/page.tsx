'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

interface AssessmentRow {
  id: string;
  title: string;
  department: string;
  status: string;
  hazard_count: number;
  type: 'risk' | 'chemical';
  version: number;
  created_at?: string;
}

export default function AssessmentsPage() {
  const [rows, setRows] = useState<AssessmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'risk' | 'chemical'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchAssessments();
  }, [router]);

  async function fetchAssessments() {
    try {
      setLoading(true);
      const [riskRes, chemicalRes] = await Promise.all([
        supabase.from('risk_assessments').select('*'),
        supabase.from('chemical_assessments').select('*'),
      ]);

      const risk: AssessmentRow[] = (riskRes.data || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        department: a.department,
        status: a.status,
        hazard_count: Array.isArray(a.content) ? a.content.length : 0,
        type: 'risk',
        version: a.version || 1,
        created_at: a.created_at,
      }));

      const chemical: AssessmentRow[] = (chemicalRes.data || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        department: a.department,
        status: a.status,
        hazard_count: Array.isArray(a.content) ? a.content.length : 0,
        type: 'chemical',
        version: a.version || 1,
        created_at: a.created_at,
      }));

      const combined = [...risk, ...chemical].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      setRows(combined);
    } catch (err) {
      console.error('Error fetching assessments:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (statusFilter !== 'all' && (r.status || 'active') !== statusFilter) return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, typeFilter, statusFilter, search]);

  async function handleDelete(row: AssessmentRow) {
    if (!confirm(`Delete "${row.title}"? It will be archived (hidden from the active list and no longer assignable), but its history is kept for anyone who has already signed it. You can restore it later.`)) return;

    try {
      setBusyId(row.id);
      const table = row.type === 'risk' ? 'risk_assessments' : 'chemical_assessments';
      const { error } = await supabase.from(table).update({ status: 'archived' }).eq('id', row.id);
      if (error) throw error;

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      await logAudit('assessment_deleted', userData.id, row.id, row.type === 'risk' ? 'risk_assessment' : 'chemical_assessment', { title: row.title });

      await fetchAssessments();
    } catch (err) {
      console.error('Error deleting assessment:', err);
      alert('Failed to delete assessment');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(row: AssessmentRow) {
    try {
      setBusyId(row.id);
      const table = row.type === 'risk' ? 'risk_assessments' : 'chemical_assessments';
      const { error } = await supabase.from(table).update({ status: 'active' }).eq('id', row.id);
      if (error) throw error;

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      await logAudit('assessment_restored', userData.id, row.id, row.type === 'risk' ? 'risk_assessment' : 'chemical_assessment', { title: row.title });

      await fetchAssessments();
    } catch (err) {
      console.error('Error restoring assessment:', err);
      alert('Failed to restore assessment');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>Assessments</h1>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-wrap gap-3 mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title..."
              className="flex-1 min-w-[200px] px-4 py-2 border rounded-lg text-black"
            />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="px-4 py-2 border rounded-lg text-black">
              <option value="all">All Types</option>
              <option value="risk">Risk Assessments</option>
              <option value="chemical">Chemical Assessments</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-4 py-2 border rounded-lg text-black">
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All Statuses</option>
            </select>
            <a href="/dashboard/manager/create-risk-assessment" style={{ backgroundColor: '#f89939' }} className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90">➕ New Risk Assessment</a>
            <a href="/dashboard/manager/create-chemical-assessment" style={{ backgroundColor: '#f89939' }} className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90">➕ New Chemical Assessment</a>
          </div>

          {loading ? (
            <p className="text-gray-600">Loading assessments...</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-600">No assessments found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white text-left">
                    <th className="p-3">Title</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Hazards</th>
                    <th className="p-3">Version</th>
                    <th className="p-3">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={`${r.type}-${r.id}`} className="border-b hover:bg-gray-50 align-middle">
                      <td className="p-3 font-semibold text-gray-800">{r.title}</td>
                      <td className="p-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${r.type === 'risk' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                          {r.type === 'risk' ? 'Risk' : 'Chemical'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-700">{r.department}</td>
                      <td className="p-3 text-gray-700">{r.hazard_count}</td>
                      <td className="p-3 text-gray-700">v{r.version}</td>
                      <td className="p-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${r.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {r.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <a
                            href={`/dashboard/manager/view-assessment/${r.id}?type=${r.type}`}
                            style={{ backgroundColor: '#f89939' }}
                            className="px-4 py-1.5 text-white rounded-lg font-semibold hover:opacity-90 text-xs whitespace-nowrap inline-block"
                          >
                            🖨️ View / Print
                          </a>
                          <a
                            href={`/dashboard/manager/edit-assessment/${r.id}?type=${r.type}`}
                            className="px-4 py-1.5 bg-gray-700 text-white rounded-lg font-semibold hover:opacity-90 text-xs whitespace-nowrap inline-block"
                          >
                            ✏️ Edit
                          </a>
                          {r.status === 'archived' ? (
                            <button
                              onClick={() => handleRestore(r)}
                              disabled={busyId === r.id}
                              className="px-4 py-1.5 bg-green-600 text-white rounded-lg font-semibold hover:opacity-90 text-xs whitespace-nowrap disabled:opacity-50"
                            >
                              ♻️ Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDelete(r)}
                              disabled={busyId === r.id}
                              className="px-4 py-1.5 bg-red-600 text-white rounded-lg font-semibold hover:opacity-90 text-xs whitespace-nowrap disabled:opacity-50"
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      </td>
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
