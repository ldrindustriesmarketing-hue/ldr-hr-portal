'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';
import { HAZARD_CLASSIFICATIONS, getHazardClass } from '@/lib/chemicalHazards';

interface ChemicalEntry {
  id: string;
  product_name: string;
  manufacturer: string | null;
  location: string | null;
  quantity: string | null;
  hazard_classification: string | null;
  sds_review_date: string | null;
  sds_document: string | null;
  status: string;
}

export default function ChemicalRegisterPage() {
  const [chemicals, setChemicals] = useState<ChemicalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hazardFilter, setHazardFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchChemicals();
  }, [router]);

  async function fetchChemicals() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('chemical_register').select('*').order('product_name', { ascending: true });
      if (error) throw error;
      setChemicals(data || []);
    } catch (err) {
      console.error('Error fetching chemical register:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(chem: ChemicalEntry) {
    if (!confirm(`Delete "${chem.product_name}" from the chemical register? It will be archived (hidden from the active register) and can be restored later.`)) return;

    try {
      setBusyId(chem.id);
      const { error } = await supabase.from('chemical_register').update({ status: 'archived' }).eq('id', chem.id);
      if (error) throw error;

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      await logAudit('chemical_register_deleted', userData.id, chem.id, 'chemical_register', { product_name: chem.product_name });

      await fetchChemicals();
    } catch (err) {
      console.error('Error deleting chemical:', err);
      alert('Failed to delete chemical');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(chem: ChemicalEntry) {
    try {
      setBusyId(chem.id);
      const { error } = await supabase.from('chemical_register').update({ status: 'active' }).eq('id', chem.id);
      if (error) throw error;

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      await logAudit('chemical_register_restored', userData.id, chem.id, 'chemical_register', { product_name: chem.product_name });

      await fetchChemicals();
    } catch (err) {
      console.error('Error restoring chemical:', err);
      alert('Failed to restore chemical');
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    return chemicals.filter((c) => {
      if (statusFilter !== 'all' && (c.status || 'active') !== statusFilter) return false;
      if (hazardFilter !== 'all' && c.hazard_classification !== hazardFilter) return false;
      if (search) {
        const term = search.toLowerCase();
        if (!c.product_name.toLowerCase().includes(term) && !(c.manufacturer || '').toLowerCase().includes(term) && !(c.location || '').toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [chemicals, search, hazardFilter, statusFilter]);

  function sdsStatus(reviewDate: string | null) {
    if (!reviewDate) return null;
    const days = Math.ceil((new Date(reviewDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: 'SDS Review Overdue', color: 'bg-red-100 text-red-800' };
    if (days <= 30) return { label: `SDS Due in ${days}d`, color: 'bg-yellow-100 text-yellow-800' };
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>Chemical Register</h1>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-wrap gap-3 mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product, manufacturer, or location..."
              className="flex-1 min-w-[220px] px-4 py-2 border rounded-lg text-black"
            />
            <select value={hazardFilter} onChange={(e) => setHazardFilter(e.target.value)} className="px-4 py-2 border rounded-lg text-black">
              <option value="all">All Hazard Classes</option>
              {HAZARD_CLASSIFICATIONS.map((h) => (
                <option key={h.value} value={h.value}>{h.value}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-4 py-2 border rounded-lg text-black">
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All Statuses</option>
            </select>
            <a href="/dashboard/manager/chemical-register/add" style={{ backgroundColor: '#f89939' }} className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90">➕ Add Chemical</a>
          </div>

          {loading ? (
            <p className="text-gray-600">Loading chemical register...</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-600">No chemicals found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white text-left">
                    <th className="p-3">Product</th>
                    <th className="p-3">Manufacturer</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Hazard Class</th>
                    <th className="p-3">SDS Review</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const hazard = c.hazard_classification ? getHazardClass(c.hazard_classification) : null;
                    const sds = sdsStatus(c.sds_review_date);
                    return (
                      <tr key={c.id} className="border-b hover:bg-gray-50 align-middle">
                        <td className="p-3 font-semibold text-gray-800">{c.product_name}</td>
                        <td className="p-3 text-gray-700">{c.manufacturer || '—'}</td>
                        <td className="p-3 text-gray-700">{c.location || '—'}</td>
                        <td className="p-3 text-gray-700">{c.quantity || '—'}</td>
                        <td className="p-3">
                          {hazard && (
                            <span className="px-2 py-1 rounded font-semibold text-xs whitespace-nowrap" style={{ backgroundColor: hazard.color, color: hazard.textColor }}>{hazard.value}</span>
                          )}
                        </td>
                        <td className="p-3">
                          {sds ? (
                            <span className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap ${sds.color}`}>{sds.label}</span>
                          ) : c.sds_review_date ? (
                            <span className="text-xs text-gray-500">{new Date(c.sds_review_date).toLocaleDateString()}</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <a href={`/dashboard/manager/chemical-register/edit/${c.id}`} className="px-3 py-1.5 bg-gray-700 text-white rounded-lg font-semibold hover:opacity-90 text-xs whitespace-nowrap">✏️ Edit</a>
                            {c.status === 'archived' ? (
                              <button onClick={() => handleRestore(c)} disabled={busyId === c.id} className="px-3 py-1.5 bg-green-600 text-white rounded-lg font-semibold hover:opacity-90 text-xs whitespace-nowrap disabled:opacity-50">♻️ Restore</button>
                            ) : (
                              <button onClick={() => handleDelete(c)} disabled={busyId === c.id} className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-semibold hover:opacity-90 text-xs whitespace-nowrap disabled:opacity-50">🗑️ Delete</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
