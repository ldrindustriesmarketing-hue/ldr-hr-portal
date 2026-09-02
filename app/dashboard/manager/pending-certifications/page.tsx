'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

interface CertRow {
  id: string;
  title: string;
  issuer: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: string;
  source: string | null;
  rejection_reason: string | null;
  employee_id: string;
  employee_name?: string;
}

function statusBadge(status: string, source: string | null) {
  if (status === 'pending_review') return { label: 'PENDING REVIEW', color: 'bg-blue-100 text-blue-800' };
  if (status === 'rejected') return { label: 'REJECTED', color: 'bg-red-100 text-red-800' };
  if (status === 'signed') return { label: source === 'employee' ? 'APPROVED' : 'SIGNED', color: 'bg-green-100 text-green-800' };
  return { label: 'PENDING SIGNATURE', color: 'bg-yellow-100 text-yellow-800' };
}

export default function PendingCertificationsPage() {
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending_review' | 'signed' | 'rejected' | 'all'>('pending_review');
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchCerts();
  }, [router]);

  async function fetchCerts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('certifications')
        .select('id, title, issuer, issue_date, expiry_date, status, source, rejection_reason, employee_id')
        .eq('source', 'employee')
        .order('issue_date', { ascending: false });

      if (error) throw error;

      const rows: CertRow[] = data || [];
      const employeeIds = Array.from(new Set(rows.map((r) => r.employee_id)));

      const { data: empData } = employeeIds.length
        ? await supabase.from('employees').select('id, name').in('id', employeeIds)
        : { data: [] as { id: string; name: string }[] };

      const nameMap = new Map<string, string>();
      (empData || []).forEach((e) => nameMap.set(e.id, e.name));

      setCerts(rows.map((r) => ({ ...r, employee_name: nameMap.get(r.employee_id) || 'Unknown' })));
    } catch (err) {
      console.error('Error fetching certifications:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(c: CertRow) {
    if (!confirm(`Approve "${c.title}" for ${c.employee_name}? This confirms you've verified it and marks it as complete on the register.`)) return;

    try {
      const { error } = await supabase.from('certifications').update({ status: 'signed', rejection_reason: null }).eq('id', c.id);
      if (error) throw error;

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      await logAudit('certification_approved', userData.id, c.id, 'certification', { employee_id: c.employee_id, title: c.title });

      await fetchCerts();
    } catch (err) {
      console.error('Error approving certification:', err);
      alert('Failed to approve certification');
    }
  }

  async function handleReject(c: CertRow) {
    const reason = prompt(`Reject "${c.title}" for ${c.employee_name}? Enter a reason (shown to the employee):`);
    if (reason === null) return;

    try {
      const { error } = await supabase.from('certifications').update({ status: 'rejected', rejection_reason: reason || null }).eq('id', c.id);
      if (error) throw error;

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      await logAudit('certification_rejected', userData.id, c.id, 'certification', { employee_id: c.employee_id, title: c.title, reason });

      await fetchCerts();
    } catch (err) {
      console.error('Error rejecting certification:', err);
      alert('Failed to reject certification');
    }
  }

  const filtered = useMemo(() => {
    return certs.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (search) {
        const term = search.toLowerCase();
        if (!c.title.toLowerCase().includes(term) && !(c.employee_name || '').toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [certs, statusFilter, search]);

  const pendingCount = certs.filter((c) => c.status === 'pending_review').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>Employee-Submitted Certifications</h1>
            <p className="text-gray-600 text-sm mt-1">{pendingCount} awaiting review</p>
          </div>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-wrap gap-3 mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or employee..."
              className="flex-1 min-w-[220px] px-4 py-2 border rounded-lg text-black"
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-4 py-2 border rounded-lg text-black">
              <option value="pending_review">Pending Review</option>
              <option value="signed">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Statuses</option>
            </select>
          </div>

          {loading ? (
            <p className="text-gray-600">Loading submissions...</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-600">No submissions found.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((c) => {
                const badge = statusBadge(c.status, c.source);
                return (
                  <div key={c.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-800">{c.title}</p>
                        <p className="text-sm text-gray-600">
                          {c.employee_name} {c.issuer ? `· ${c.issuer}` : ''} · Issued {c.issue_date ? new Date(c.issue_date).toLocaleDateString() : '—'}
                          {c.expiry_date ? ` · Expires ${new Date(c.expiry_date).toLocaleDateString()}` : ''}
                        </p>
                        <span className={`text-xs font-bold px-2 py-1 rounded mt-2 inline-block ${badge.color}`}>{badge.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={`/dashboard/employee/view-record/${c.id}?type=certification`} className="px-3 py-1.5 bg-gray-700 text-white rounded-lg font-semibold hover:opacity-90 text-xs whitespace-nowrap">View</a>
                        {c.status === 'pending_review' && (
                          <>
                            <button onClick={() => handleApprove(c)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg font-semibold hover:opacity-90 text-xs whitespace-nowrap">✅ Approve</button>
                            <button onClick={() => handleReject(c)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-semibold hover:opacity-90 text-xs whitespace-nowrap">❌ Reject</button>
                          </>
                        )}
                      </div>
                    </div>
                    {c.status === 'rejected' && c.rejection_reason && (
                      <p className="text-xs text-red-700 mt-2 pt-2 border-t">❌ Rejected: {c.rejection_reason}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
