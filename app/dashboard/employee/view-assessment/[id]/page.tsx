'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { RiskRow, isRiskRow, getProbabilityInfo, getSeverityInfo, getRiskRating } from '@/lib/riskMatrix';
import { getPpeItem } from '@/lib/ppe';

interface Question {
  id: string;
  text: string;
  type: 'yes-no' | 'text' | 'rating';
}

interface Assignment {
  id: string;
  assessment_id: string;
  assessment_type: 'risk' | 'chemical';
  assigned_to: string;
  due_date: string;
  status: string;
}

interface AssessmentResponse {
  responses: Record<string, any>;
  signature_data: string;
  checkbox_acknowledged: boolean;
  signed_date: string;
  signed_version?: number | null;
}

export default function ViewSignedAssessmentPage() {
  const params = useParams();
  const assignmentId = params.id as string;
  const router = useRouter();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentDescription, setAssessmentDescription] = useState('');
  const [requiredPpe, setRequiredPpe] = useState<string[]>([]);
  const [machinePhoto, setMachinePhoto] = useState('');
  const [signedVersion, setSignedVersion] = useState<number | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [riskRows, setRiskRows] = useState<RiskRow[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isMatrixContent, setIsMatrixContent] = useState(true);
  const [response, setResponse] = useState<AssessmentResponse | null>(null);
  const [employeeName, setEmployeeName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchData(JSON.parse(userData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function fetchData(user: { id: string; name: string; role: string }) {
    try {
      const { data: assignData, error: assignError } = await supabase.from('assessment_assignments').select('*').eq('id', assignmentId).single();
      if (assignError) throw assignError;

      const isOwner = assignData.assigned_to === user.id;
      const isManager = user.role === 'manager' || user.role === 'admin';
      if (!isOwner && !isManager) {
        setError('You do not have access to this assessment.');
        return;
      }
      setAssignment(assignData);

      if (isOwner) {
        setEmployeeName(user.name);
      } else {
        const { data: empData } = await supabase.from('employees').select('name').eq('id', assignData.assigned_to).single();
        setEmployeeName(empData?.name || 'Unknown');
      }

      const table = assignData.assessment_type === 'risk' ? 'risk_assessments' : 'chemical_assessments';

      const { data: responseData, error: responseError } = await supabase
        .from('assessment_responses')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('signed_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (responseError) throw responseError;

      if (!responseData) {
        setError('This assessment has not been signed yet.');
        return;
      }
      setResponse(responseData);
      setSignedVersion(responseData.signed_version ?? null);

      // Pin the displayed content to the exact version the employee signed,
      // so a later edit to the assessment doesn't rewrite what their
      // signature applied to. Falls back to the live assessment if this
      // signature predates versioning or its snapshot is unavailable.
      let resolvedContent: any = null;

      if (responseData.signed_version != null) {
        const { data: versionData } = await supabase
          .from('assessment_versions')
          .select('title, description, content, required_ppe, machine_photo')
          .eq('assessment_id', assignData.assessment_id)
          .eq('assessment_type', assignData.assessment_type)
          .eq('version', responseData.signed_version)
          .maybeSingle();
        resolvedContent = versionData || null;
      }

      const { data: liveData, error: liveError } = await supabase
        .from(table)
        .select('title, description, content, required_ppe, machine_photo, version')
        .eq('id', assignData.assessment_id)
        .single();
      if (liveError) throw liveError;
      setCurrentVersion(liveData.version || 1);

      const assessData = resolvedContent || liveData;

      setAssessmentTitle(assessData.title || '');
      setAssessmentDescription(assessData.description || '');
      setRequiredPpe(assessData.required_ppe || []);
      setMachinePhoto(assessData.machine_photo || '');

      const content = assessData.content || [];
      if (content.length === 0 || content.every(isRiskRow)) {
        setRiskRows(content);
        setIsMatrixContent(true);
      } else {
        setQuestions(content);
        setIsMatrixContent(false);
      }
    } catch (err) {
      console.error('Error loading signed assessment:', err);
      setError('Failed to load signed assessment');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading signed assessment...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!assignment || !response) return <div className="p-8 text-center">Signed assessment not found</div>;

  const isRisk = isMatrixContent;
  const assessmentLabel = assignment.assessment_type === 'chemical' ? 'Chemical Assessment' : 'Risk Assessment';
  const signedDate = new Date(response.signed_date);

  return (
    <div className="min-h-screen bg-gray-50 p-6 print:bg-white print:p-0">
      <div className={isRisk ? 'max-w-5xl mx-auto' : 'max-w-2xl mx-auto'}>
        <div className="flex justify-between items-center mb-8 print:hidden">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Signed Assessment</p>
            <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>{assessmentTitle || assessmentLabel}</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
            <button onClick={() => window.print()} style={{ backgroundColor: '#f89939' }} className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90">🖨️ Print / Save as PDF</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none print:p-0">
          <div className="hidden print:block mb-6 pb-4 border-b">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Signed Assessment</p>
            <h2 className="text-2xl font-bold" style={{ color: '#f89939' }}>{assessmentTitle || assessmentLabel}</h2>
          </div>

          <div className="mb-6 pb-6 border-b flex items-start justify-between gap-4">
            <div>
              {assessmentDescription && <p className="text-gray-600">{assessmentDescription}</p>}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-bold px-2 py-1 rounded bg-orange-100 text-orange-800 whitespace-nowrap">{assessmentLabel}</span>
              <span className="text-xs font-bold px-2 py-1 rounded bg-gray-200 text-gray-700 whitespace-nowrap">Signed at Version {signedVersion ?? '—'}</span>
            </div>
          </div>

          {currentVersion !== null && signedVersion !== null && currentVersion > signedVersion && (
            <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 print:hidden">
              ⚠️ This assessment has since been updated to Version {currentVersion}. This page shows exactly what was reviewed and signed at Version {signedVersion} — it will not reflect later changes.
            </div>
          )}

          {machinePhoto && (
            <div className="mb-6 pb-6 border-b">
              <h3 className="font-bold text-lg mb-3" style={{ color: '#f89939' }}>Machine / Work Area</h3>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={machinePhoto} alt="Machine" className="rounded-lg border max-h-80" />
            </div>
          )}

          {requiredPpe.length > 0 && (
            <div className="mb-6 pb-6 border-b">
              <h3 className="font-bold text-lg mb-3" style={{ color: '#f89939' }}>Required Safety Equipment</h3>
              <div className="flex flex-wrap gap-3">
                {requiredPpe.map((id) => {
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

          {isRisk ? (
            <div>
              <h3 className="font-bold text-lg mb-4" style={{ color: '#f89939' }}>Hazards</h3>
              {riskRows.length === 0 ? (
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
                      {riskRows.map((r) => {
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
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q) => {
                const answer = response.responses?.[q.id];
                return (
                  <div key={q.id} className="p-4 border rounded-lg bg-gray-50 print:bg-white">
                    <p className="font-semibold text-gray-800 mb-1">{q.text}</p>
                    <p className="text-gray-700">
                      {q.type === 'yes-no' && (answer === 'yes' ? 'Yes' : answer === 'no' ? 'No' : '—')}
                      {q.type === 'text' && (answer || '—')}
                      {q.type === 'rating' && (answer ? `${answer} / 5` : '—')}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t pt-6 mt-8">
            <h3 className="font-bold text-lg mb-4" style={{ color: '#f89939' }}>Employee Acknowledgement</h3>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg print:bg-white print:border-gray-300 mb-4">
              <p className="text-blue-900">
                {response.checkbox_acknowledged ? '✅' : '❌'}{' '}
                {isRisk
                  ? 'The employee acknowledged that they reviewed and understood the hazards, risks, and control measures listed above and agreed to comply with all requirements.'
                  : 'The employee acknowledged that they reviewed and understood this assessment and agreed to comply with all requirements.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 items-end">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Signature</p>
                {response.signature_data ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={response.signature_data} alt="Employee signature" className="border rounded-lg bg-white max-w-full" style={{ maxHeight: 120 }} />
                ) : (
                  <p className="text-gray-500">No signature captured</p>
                )}
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <p><span className="font-semibold">Signed by:</span> {employeeName}</p>
                <p><span className="font-semibold">Date:</span> {signedDate.toLocaleDateString()} {signedDate.toLocaleTimeString()}</p>
                <p><span className="font-semibold">Status:</span> Signed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
