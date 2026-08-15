'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';
import {
  PROBABILITY_LEVELS,
  SEVERITY_LEVELS,
  getProbabilityInfo,
  getSeverityInfo,
  getRiskRating,
  RiskRow,
  ProbabilityLevel,
  SeverityLevel,
} from '@/lib/riskMatrix';
import { PPE_ITEMS } from '@/lib/ppe';
import { compressImageFile } from '@/lib/image';

export default function CreateChemicalAssessmentPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('Administration');
  const [requiredPpe, setRequiredPpe] = useState<string[]>([]);
  const [machinePhoto, setMachinePhoto] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [rows, setRows] = useState<RiskRow[]>([]);

  const [hazard, setHazard] = useState('');
  const [risk, setRisk] = useState('');
  const [probability, setProbability] = useState<ProbabilityLevel>('Occasional');
  const [severity, setSeverity] = useState<SeverityLevel>('Moderate');
  const [actions, setActions] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    }
  }, [router]);

  const probabilityInfo = getProbabilityInfo(probability);
  const severityInfo = getSeverityInfo(severity);
  const previewRating = getRiskRating(probabilityInfo.score, severityInfo.score);

  function addRow() {
    if (!hazard.trim() || !risk.trim() || !actions.trim()) return;

    const row: RiskRow = {
      id: Date.now().toString(),
      hazard,
      risk,
      probability,
      severity,
      actions,
    };

    setRows([...rows, row]);
    setHazard('');
    setRisk('');
    setActions('');
    setProbability('Occasional');
    setSeverity('Moderate');
  }

  function removeRow(id: string) {
    setRows(rows.filter((r) => r.id !== id));
  }

  function togglePpe(id: string) {
    setRequiredPpe((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setPhotoUploading(true);
      const dataUrl = await compressImageFile(file);
      setMachinePhoto(dataUrl);
    } catch (err) {
      console.error('Error processing photo:', err);
      setError('Failed to process photo');
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!title || rows.length === 0) {
      setError('Please enter a title and add at least one hazard row');
      return;
    }

    setLoading(true);

    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      const { data, error: insertError } = await supabase
        .from('chemical_assessments')
        .insert({
          title,
          description,
          department,
          created_by: userData.id,
          content: rows,
          required_ppe: requiredPpe,
          machine_photo: machinePhoto || null,
          status: 'active',
        })
        .select();

      if (insertError) throw insertError;

      await logAudit(
        'assessment_created',
        userData.id,
        data[0].id,
        'chemical_assessment',
        { title, department, hazards_count: rows.length }
      );

      router.push('/dashboard/manager');
    } catch (err) {
      console.error('Error creating assessment:', err);
      setError('Failed to create assessment');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>Create Chemical Assessment</h1>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Assessment Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="e.g., Cleaning Chemicals Handling Assessment" required disabled={loading} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="Brief description of the assessment" rows={3} disabled={loading} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Department *</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" disabled={loading}>
                <option value="Administration">Administration</option>
                <option value="Manufacturing">Manufacturing</option>
              </select>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#f89939' }}>Required Safety Equipment</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PPE_ITEMS.map((item) => {
                  const selected = requiredPpe.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-2 px-4 py-3 border rounded-lg cursor-pointer transition ${selected ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <input type="checkbox" checked={selected} onChange={() => togglePpe(item.id)} className="w-4 h-4" disabled={loading} />
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-sm font-semibold text-gray-800">{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#f89939' }}>Machine Photo</h3>
              <p className="text-sm text-gray-600 mb-3">Upload a photo of the actual machine or work area this assessment covers.</p>
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="w-full px-4 py-2 border rounded-lg" disabled={loading || photoUploading} />
              {photoUploading && <p className="text-sm text-gray-500 mt-2">Processing photo...</p>}
              {machinePhoto && (
                <div className="mt-4 relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={machinePhoto} alt="Machine preview" className="rounded-lg border max-h-64" />
                  <button type="button" onClick={() => setMachinePhoto('')} className="absolute top-2 right-2 bg-white/90 text-red-600 rounded-full w-7 h-7 font-bold hover:bg-white" disabled={loading}>✕</button>
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#f89939' }}>Hazards</h3>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">Hazard</label>
                  <input type="text" value={hazard} onChange={(e) => setHazard(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="e.g., Exposure to corrosive cleaning agent" disabled={loading} />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">Risk of the Hazard</label>
                  <textarea value={risk} onChange={(e) => setRisk(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="What could go wrong and who/what it affects" rows={2} disabled={loading} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">Probability</label>
                    <select
                      value={probability}
                      onChange={(e) => setProbability(e.target.value as ProbabilityLevel)}
                      className="w-full px-4 py-2 border rounded-lg font-semibold"
                      style={{ backgroundColor: probabilityInfo.color, color: probabilityInfo.textColor }}
                      disabled={loading}
                    >
                      {PROBABILITY_LEVELS.map((p) => (
                        <option key={p.value} value={p.value} style={{ backgroundColor: p.color, color: p.textColor }}>
                          {p.value} ({p.hint})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">Severity</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                      className="w-full px-4 py-2 border rounded-lg font-semibold"
                      style={{ backgroundColor: severityInfo.color, color: severityInfo.textColor }}
                      disabled={loading}
                    >
                      {SEVERITY_LEVELS.map((s) => (
                        <option key={s.value} value={s.value} style={{ backgroundColor: s.color, color: s.textColor }}>
                          {s.value} ({s.hint})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 font-semibold">Resulting Risk Rating:</span>
                  <span className="px-3 py-1 rounded-full font-bold" style={{ backgroundColor: previewRating.color, color: previewRating.textColor }}>
                    {previewRating.label} ({previewRating.score})
                  </span>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">Actions to Minimise Risk</label>
                  <textarea value={actions} onChange={(e) => setActions(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="Controls / mitigations to reduce the risk" rows={2} disabled={loading} />
                </div>

                <button type="button" onClick={addRow} disabled={loading || !hazard.trim() || !risk.trim() || !actions.trim()} style={{ backgroundColor: '#f89939' }} className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50">Add Hazard</button>
              </div>

              {rows.length === 0 ? (
                <p className="text-gray-600">No hazards added yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-800 text-white text-left">
                        <th className="p-2">Hazard</th>
                        <th className="p-2">Risk</th>
                        <th className="p-2">Probability</th>
                        <th className="p-2">Severity</th>
                        <th className="p-2">Rating</th>
                        <th className="p-2">Actions to Minimise Risk</th>
                        <th className="p-2"></th>
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
                            <td className="p-2">
                              <button type="button" onClick={() => removeRow(r.id)} className="text-red-500 hover:text-red-700 font-semibold" disabled={loading}>✕</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading || rows.length === 0} style={{ backgroundColor: '#f89939' }} className="w-full text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Assessment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
