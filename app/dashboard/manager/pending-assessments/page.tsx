'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface AssignmentRow {
  id: string;
  assessment_type: 'risk' | 'chemical';
  assessment_id: string;
  assigned_to: string;
  due_date: string;
  status: string;
  employee_name?: string;
  assessment_title?: string;
}

export default function PendingAssessmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'signed' | 'all'>('pending');
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchAssignments();
  }, [router]);

  async function fetchAssignments() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assessment_assignments')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;

      const rows: AssignmentRow[] = data || [];

      const employeeIds = Array.from(new Set(rows.map((r) => r.assigned_to)));
      const riskIds = rows.filter((r) => r.assessment_type === 'risk').map((r) => r.assessment_id);
      const chemicalIds = rows.filter((r) => r.assessment_type === 'chemical').map((r) => r.assessment_id);

      const [empRes, riskRes, chemicalRes] = await Promise.all([
        employeeIds.length ? supabase.from('employees').select('id, name').in('id', employeeIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
        riskIds.length ? supabase.from('risk_assessments').select('id, title').in('id', riskIds) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
        chemicalIds.length ? supabase.from('chemical_assessments').select('id, title').in('id', chemicalIds) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
      ]);

      const nameMap = new Map<string, string>();
      (empRes.data || []).forEach((e) => nameMap.set(e.id, e.name));
      const titleMap = new Map<string, string>();
      (riskRes.data || []).forEach((a) => titleMap.set(a.id, a.title));
      (chemicalRes.data || []).forEach((a) => titleMap.set(a.id, a.title));

      setAssignments(
        rows.map((r) => ({
          ...r,
          employee_name: nameMap.get(r.assigned_to) || 'Unknown',
          assessment_title: titleMap.get(r.assessment_id) || 'Untitled Assessment',
        }))
      );
    } catch (err) {
      console.error('Error fetching assignments:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return assignments.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (search) {
        const term = search.toLowerCase();
        if (!a.employee_name?.toLowerCase().includes(term) && !a.assessment_title?.toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [assignments, statusFilter, search]);

  const pendingCount = assignments.filter((a) => a.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>Pending Assessments</h1>
            <p className="text-gray-600 text-sm mt-1">{pendingCount} assessment{pendingCount === 1 ? '' : 's'} awaiting completion</p>
          </div>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-wrap gap-3 mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee or assessment title..."
              className="flex-1 min-w-[220px] px-4 py-2 border rounded-lg text-black"
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-4 py-2 border rounded-lg text-black">
              <option value="pending">Pending</option>
              <option value="signed">Signed</option>
              <option value="all">All Statuses</option>
            </select>
            <a href="/dashboard/manager/assign-assessments" style={{ backgroundColor: '#f89939' }} className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90">✓ Assign Assessments</a>
          </div>

          {loading ? (
            <p className="text-gray-600">Loading assignments...</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-600">No assignments found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white text-left">
                    <th className="p-3">Employee</th>
                    <th className="p-3">Assessment</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-b hover:bg-gray-50 align-middle">
                      <td className="p-3 font-semibold text-gray-800">{a.employee_name}</td>
                      <td className="p-3 text-gray-700">{a.assessment_title}</td>
                      <td className="p-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${a.assessment_type === 'risk' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                          {a.assessment_type === 'risk' ? 'Risk' : 'Chemical'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-700">{new Date(a.due_date).toLocaleDateString()}</td>
                      <td className="p-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${a.status === 'signed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {a.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3">
                        {a.status === 'signed' ? (
                          <a href={`/dashboard/employee/view-assessment/${a.id}`} style={{ backgroundColor: '#f89939' }} className="px-3 py-1.5 text-white rounded-lg font-semibold hover:opacity-90 text-xs whitespace-nowrap inline-block">View Signed Copy</a>
                        ) : (
                          <a href={`/dashboard/manager/employee-documents/${a.assigned_to}`} className="px-3 py-1.5 bg-gray-700 text-white rounded-lg font-semibold hover:opacity-90 text-xs whitespace-nowrap inline-block">View Employee</a>
                        )}
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
