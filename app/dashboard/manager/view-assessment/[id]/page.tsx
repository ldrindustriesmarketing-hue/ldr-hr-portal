'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { RiskRow, isRiskRow, getProbabilityInfo, getSeverityInfo, getRiskRating } from '@/lib/riskMatrix';
import { getPpeItem } from '@/lib/ppe';

interface AssessmentDetail {
  id: string;
  title: string;
  description: string;
  department: string;
  status: string;
  content: any[];
  required_ppe?: string[];
  machine_photo?: string;
  version?: number;
}

interface VersionEntry {
  id: string;
  version: number;
  change_note: string;
  changed_by_name: string | null;
  created_at: string;
}

export default function ViewAssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const type = (searchParams.get('type') === 'chemical' ? 'chemical' : 'risk') as 'risk' | 'chemical';

  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchAssessment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type]);

  async function fetchAssessment() {
    try {
      setLoading(true);
      const table = type === 'risk' ? 'risk_assessments' : 'chemical_assessments';
      const { data, error: fetchError } = await supabase.from(table).select('*').eq('id', id).single();

      if (fetchError) throw fetchError;
      setAssessment(data);

      const { data: versionData, error: versionError } = await supabase
        .from('assessment_versions')
        .select('id, version, change_note, changed_by_name, created_at')
        .eq('assessment_id', id)
        .eq('assessment_type', type)
        .order('version', { ascending: false });

      if (versionError) {
        console.error('Error fetching version history:', versionError);
      } else {
        setVersions(versionData || []);
      }
    } catch (err) {
      console.error('Error fetching assessment:', err);
      setError('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading assessment...</div>;
  if (error || !assessment) return <div className="p-8 text-center text-red-600">{error || 'Assessment not found'}</div>;

  const rows: RiskRow[] = Array.isArray(assessment.content) && assessment.content.every(isRiskRow) ? assessment.content : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6 print:bg-white print:p-0">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8 print:hidden">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>View Assessment</h1>
          <div className="flex gap-3">
            <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
            <a href={`/dashboard/manager/edit-assessment/${id}?type=${type}`} className="px-6 py-2 bg-gray-700 text-white rounded-lg font-semibold hover:opacity-90">✏️ Edit</a>
            <button onClick={() => window.print()} style={{ backgroundColor: '#f89939' }} className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90">🖨️ Print / Save as PDF</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none print:p-0">
          <div className="flex items-center justify-between gap-4 mb-6 pb-6 border-b">
            <div className="flex items-center gap-4">
              <Image src="/ldr.logo.png" alt="LDR Logo" width={50} height={50} />
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{type === 'risk' ? 'Risk Assessment' : 'Chemical Assessment'}</p>
                <h2 className="text-2xl font-bold" style={{ color: '#f89939' }}>{assessment.title}</h2>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded bg-gray-200 text-gray-700 whitespace-nowrap">Version {assessment.version || 1}</span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Department</p>
              <p className="text-gray-800">{assessment.department}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Status</p>
              <p className="text-gray-800">{assessment.status?.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Generated</p>
              <p className="text-gray-800">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {assessment.description && (
            <p className="text-gray-700 mb-6">{assessment.description}</p>
          )}

          {assessment.machine_photo && (
            <div className="mb-6 pb-6 border-b">
              <h3 className="font-bold text-lg mb-3" style={{ color: '#f89939' }}>Machine / Work Area</h3>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assessment.machine_photo} alt="Machine" className="rounded-lg border max-h-80" />
            </div>
          )}

          {!!assessment.required_ppe?.length && (
            <div className="mb-6 pb-6 border-b">
              <h3 className="font-bold text-lg mb-3" style={{ color: '#f89939' }}>Required Safety Equipment</h3>
              <div className="flex flex-wrap gap-3">
                {assessment.required_ppe.map((id) => {
                  const item = getPpeItem(id);
                  if (!item) return null;
                  return (
                    <span key={id} className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-sm font-semibold text-gray-800">{item.label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {rows.length === 0 ? (
            <p className="text-gray-600">No hazards listed on this assessment.</p>
          ) : (
            <div className="overflow-x-auto border rounded-lg print:border-0">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white text-left print:bg-gray-200 print:text-black">
                    <th className="p-2">Hazard</th>
                    <th className="p-2">Risk</th>
                    <th className="p-2">Probability</th>
                    <th className="p-2">Severity</th>
                    <th className="p-2">Rating</th>
                    <th className="p-2">Actions to Minimise Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const pInfo = getProbabilityInfo(r.probability);
                    const sInfo = getSeverityInfo(r.severity);
                    const rating = getRiskRating(pInfo.score, sInfo.score);
                    return (
                      <tr key={r.id} className="border-b align-top">
                        <td className="p-2 font-semibold text-gray-800">{r.hazard}</td>
                        <td className="p-2 text-gray-700">{r.risk}</td>
                        <td className="p-2">
                          <span className="px-2 py-1 rounded font-semibold whitespace-nowrap" style={{ backgroundColor: pInfo.color, color: pInfo.textColor }}>{r.probability}</span>
                        </td>
                        <td className="p-2">
                          <span className="px-2 py-1 rounded font-semibold whitespace-nowrap" style={{ backgroundColor: sInfo.color, color: sInfo.textColor }}>{r.severity}</span>
                        </td>
                        <td className="p-2">
                          <span className="px-2 py-1 rounded font-semibold whitespace-nowrap" style={{ backgroundColor: rating.color, color: rating.textColor }}>{rating.label}</span>
                        </td>
                        <td className="p-2 text-gray-700">{r.actions}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {versions.length > 0 && (
            <div className="mt-8 pt-6 border-t print:hidden">
              <h3 className="font-bold text-lg mb-4" style={{ color: '#f89939' }}>Version History</h3>
              <div className="space-y-3">
                {versions.map((v) => (
                  <div key={v.id} className="p-3 border rounded-lg bg-gray-50">
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-xs font-bold px-2 py-1 rounded bg-gray-200 text-gray-700 whitespace-nowrap">v{v.version}</span>
                      <p className="text-xs text-gray-500 whitespace-nowrap">{new Date(v.created_at).toLocaleString()}</p>
                    </div>
                    <p className="text-gray-800 text-sm mt-2">{v.change_note}</p>
                    <p className="text-xs text-gray-500 mt-1">By {v.changed_by_name || 'Unknown'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
