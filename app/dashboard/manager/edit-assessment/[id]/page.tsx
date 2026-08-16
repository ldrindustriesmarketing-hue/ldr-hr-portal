'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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

export default function EditAssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const type = (searchParams.get('type') === 'chemical' ? 'chemical' : 'risk') as 'risk' | 'chemical';
  const table = type === 'risk' ? 'risk_assessments' : 'chemical_assessments';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('Administration');
  const [requiredPpe, setRequiredPpe] = useState<string[]>([]);
  const [machinePhoto, setMachinePhoto] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [rows, setRows] = useState<RiskRow[]>([]);
  const [currentVersion, setCurrentVersion] = useState(1);

  const [hazard, setHazard] = useState('');
  const [risk, setRisk] = useState('');
  const [probability, setProbability] = useState<ProbabilityLevel>('Occasional');
  const [severity, setSeverity] = useState<SeverityLevel>('Moderate');
  const [actions, setActions] = useState('');

  const [changeNote, setChangeNote] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      const { data, error: fetchError } = await supabase.from(table).select('*').eq('id', id).single();
      if (fetchError) throw fetchError;

      setTitle(data.title || '');
      setDescription(data.description || '');
      setDepartment(data.department || 'Administration');
      setRequiredPpe(data.required_ppe || []);
      setMachinePhoto(data.machine_photo || '');
      setRows(data.content || []);
      setCurrentVersion(data.version || 1);
    } catch (err) {
      console.error('Error loading assessment:', err);
      setError('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }

  const probabilityInfo = getProbabilityInfo(probability);
  const severityInfo = getSeverityInfo(severity);
  const previewRating = getRiskRating(probabilityInfo.score, severityInfo.score);

  function addRow() {
    if (!hazard.trim() || !risk.trim() || !actions.trim()) return;

    const row: RiskRow = { id: Date.now().toString(), hazard, risk, probability, severity, actions };

    setRows([...rows, row]);
    setHazard('');
    setRisk('');
    setActions('');
    setProbability('Occasional');
    setSeverity('Moderate');
  }

  function removeRow(rowId: string) {
    setRows(rows.filter((r) => r.id !== rowId));
  }

  function togglePpe(ppeId: string) {
    setRequiredPpe((prev) => (prev.includes(ppeId) ? prev.filter((p) => p !== ppeId) : [...prev, ppeId]));
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

  // Assessments created before versioning existed have no assessment_versions
  // rows. Before applying an edit, back-fill their current (pre-edit) state
  // as the baseline version so any past signatures still resolve correctly.
  async function ensureBaselineVersion() {
    const { count } = await supabase
      .from('assessment_versions')
      .select('id', { count: 'exact', head: true })
      .eq('assessment_id', id)
      .eq('assessment_type', type);

    if (count) return;

    const { data: existing } = await supabase.from(table).select('*').eq('id', id).single();
    if (!existing) return;

    await supabase.from('assessment_versions').insert({
      assessment_id: id,
      assessment_type: type,
      version: existing.version || 1,
      title: existing.title,
      description: existing.description,
      department: existing.department,
      content: existing.content,
      required_ppe: existing.required_ppe || [],
      machine_photo: existing.machine_photo || null,
      change_note: 'Initial version',
      changed_by: existing.created_by || null,
      changed_by_name: null,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!title || rows.length === 0) {
      setError('Please enter a title and keep at least one hazard row');
      return;
    }
    if (!changeNote.trim()) {
      setError('Please describe what changed in this version');
      return;
    }

    setSaving(true);

    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      await ensureBaselineVersion();

      const newVersion = currentVersion + 1;

      const { error: updateError } = await supabase
        .from(table)
        .update({
          title,
          description,
          department,
          content: rows,
          required_ppe: requiredPpe,
          machine_photo: machinePhoto || null,
          version: newVersion,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      const { error: versionError } = await supabase.from('assessment_versions').insert({
        assessment_id: id,
        assessment_type: type,
        version: newVersion,
        title,
        description,
        department,
        content: rows,
        required_ppe: requiredPpe,
        machine_photo: machinePhoto || null,
        change_note: changeNote,
        changed_by: userData.id,
        changed_by_name: userData.name,
      });

      if (versionError) throw versionError;

      await logAudit(
        'assessment_edited',
        userData.id,
        id,
        type === 'risk' ? 'risk_assessment' : 'chemical_assessment',
        { title, version: newVersion, change_note: changeNote }
      );

      router.push(`/dashboard/manager/view-assessment/${id}?type=${type}`);
    } catch (err) {
      console.error('Error saving assessment:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading assessment...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
              Edit {type === 'risk' ? 'Risk' : 'Chemical'} Assessment · v{currentVersion} → v{currentVersion + 1}
            </p>
            <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>{title || 'Edit Assessment'}</h1>
          </div>
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
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" required disabled={saving} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" rows={3} disabled={saving} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Department *</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" disabled={saving}>
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
                      <input type="checkbox" checked={selected} onChange={() => togglePpe(item.id)} className="w-4 h-4" disabled={saving} />
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
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="w-full px-4 py-2 border rounded-lg" disabled={saving || photoUploading} />
              {photoUploading && <p className="text-sm text-gray-500 mt-2">Processing photo...</p>}
              {machinePhoto && (
                <div className="mt-4 relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={machinePhoto} alt="Machine preview" className="rounded-lg border max-h-64" />
                  <button type="button" onClick={() => setMachinePhoto('')} className="absolute top-2 right-2 bg-white/90 text-red-600 rounded-full w-7 h-7 font-bold hover:bg-white" disabled={saving}>✕</button>
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#f89939' }}>Hazards</h3>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">Hazard</label>
                  <input type="text" value={hazard} onChange={(e) => setHazard(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="e.g., Forklift operation in loading bay" disabled={saving} />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">Risk of the Hazard</label>
                  <textarea value={risk} onChange={(e) => setRisk(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="What could go wrong and who/what it affects" rows={2} disabled={saving} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">Probability</label>
                    <select
                      value={probability}
                      onChange={(e) => setProbability(e.target.value as ProbabilityLevel)}
                      className="w-full px-4 py-2 border rounded-lg font-semibold"
                      style={{ backgroundColor: probabilityInfo.color, color: probabilityInfo.textColor }}
                      disabled={saving}
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
                      disabled={saving}
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
                  <textarea value={actions} onChange={(e) => setActions(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="Controls / mitigations to reduce the risk" rows={2} disabled={saving} />
                </div>

                <button type="button" onClick={addRow} disabled={saving || !hazard.trim() || !risk.trim() || !actions.trim()} style={{ backgroundColor: '#f89939' }} className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50">Add Hazard</button>
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
                              <button type="button" onClick={() => removeRow(r.id)} className="text-red-500 hover:text-red-700 font-semibold" disabled={saving}>✕</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#f89939' }}>What changed in this version? *</h3>
              <textarea
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-black"
                placeholder="e.g., Increased severity rating for hazard 2 following near-miss report; added respirator requirement"
                rows={3}
                required
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-2">This note is recorded in the assessment's version history along with your name and the date.</p>
            </div>

            <button type="submit" disabled={saving || rows.length === 0} style={{ backgroundColor: '#f89939' }} className="w-full text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50">
              {saving ? 'Saving...' : `Save as Version ${currentVersion + 1}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
