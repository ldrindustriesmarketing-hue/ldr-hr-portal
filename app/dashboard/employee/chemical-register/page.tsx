'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { HAZARD_CLASSIFICATIONS, getHazardClass } from '@/lib/chemicalHazards';

interface ChemicalEntry {
  id: string;
  product_name: string;
  manufacturer: string | null;
  location: string | null;
  quantity: string | null;
  hazard_classification: string | null;
  sds_review_date: string | null;
  notes: string | null;
  sds_document: string | null;
}

export default function EmployeeChemicalRegisterPage() {
  const [chemicals, setChemicals] = useState<ChemicalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hazardFilter, setHazardFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
      const { data, error } = await supabase
        .from('chemical_register')
        .select('id, product_name, manufacturer, location, quantity, hazard_classification, sds_review_date, notes, sds_document')
        .eq('status', 'active')
        .order('product_name', { ascending: true });
      if (error) throw error;
      setChemicals(data || []);
    } catch (err) {
      console.error('Error fetching chemical register:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return chemicals.filter((c) => {
      if (hazardFilter !== 'all' && c.hazard_classification !== hazardFilter) return false;
      if (search) {
        const term = search.toLowerCase();
        if (!c.product_name.toLowerCase().includes(term) && !(c.manufacturer || '').toLowerCase().includes(term) && !(c.location || '').toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [chemicals, search, hazardFilter]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
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
          </div>

          {loading ? (
            <p className="text-gray-600">Loading chemical register...</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-600">No chemicals found.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => {
                const hazard = c.hazard_classification ? getHazardClass(c.hazard_classification) : null;
                const expanded = expandedId === c.id;
                return (
                  <div key={c.id} className="border rounded-lg">
                    <button onClick={() => setExpandedId(expanded ? null : c.id)} className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50">
                      <div>
                        <p className="font-semibold text-gray-800">{c.product_name}</p>
                        <p className="text-xs text-gray-500">{c.manufacturer || 'Unknown manufacturer'} {c.location ? `· ${c.location}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {hazard && (
                          <span className="px-2 py-1 rounded font-semibold text-xs whitespace-nowrap" style={{ backgroundColor: hazard.color, color: hazard.textColor }}>{hazard.value}</span>
                        )}
                        <span className="text-gray-400">{expanded ? '▼' : '▶'}</span>
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-4 pb-4 pt-2 border-t space-y-2 text-sm">
                        {c.quantity && <p><span className="font-semibold text-gray-700">Quantity:</span> <span className="text-gray-800">{c.quantity}</span></p>}
                        {c.sds_review_date && <p><span className="font-semibold text-gray-700">SDS Review Due:</span> <span className="text-gray-800">{new Date(c.sds_review_date).toLocaleDateString()}</span></p>}
                        {c.notes && (
                          <div>
                            <p className="font-semibold text-gray-700 mb-1">Notes</p>
                            <p className="text-gray-800 whitespace-pre-wrap">{c.notes}</p>
                          </div>
                        )}
                        {c.sds_document ? (
                          <a href={c.sds_document} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#f89939' }} className="inline-block px-4 py-2 text-white rounded-lg font-semibold hover:opacity-90 text-sm mt-2">📄 View Safety Data Sheet</a>
                        ) : (
                          <p className="text-gray-500 text-sm mt-2">No SDS document on file.</p>
                        )}
                      </div>
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
