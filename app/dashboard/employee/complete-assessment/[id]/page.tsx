'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

interface Question {
  id: string;
  text: string;
  type: 'yes-no' | 'text' | 'rating';
}

interface Assignment {
  id: string;
  assessment_id: string;
  assessment_type: 'risk' | 'chemical';
}

export default function CompleteAssessmentPage() {
  const params = useParams();
  const assignmentId = params.id as string;
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [signature, setSignature] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchAssessment();
  }, [router]);

  async function fetchAssessment() {
    try {
      const { data: assignData, error: assignError } = await supabase.from('assessment_assignments').select('*').eq('id', assignmentId).single();

      if (assignError) throw assignError;
      setAssignment(assignData);

      const table = assignData.assessment_type === 'risk' ? 'risk_assessments' : 'chemical_assessments';
      const { data: assessData, error: assessError } = await supabase.from(table).select('content').eq('id', assignData.assessment_id).single();

      if (assessError) throw assessError;
      setQuestions(assessData.content || []);
    } catch (err) {
      console.error('Error fetching assessment:', err);
      setError('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }

  function updateResponse(questionId: string, value: any) {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  }

  function startSignature() {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isDrawing = false;

    canvas.onmousedown = () => { isDrawing = true; };
    canvas.onmouseup = () => { isDrawing = false; };
    canvas.onmousemove = (e) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      ctx.lineTo(x, y);
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    };
  }

  function clearSignature() {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setSignature('');
    }
  }

  function captureSignature() {
    if (!canvasRef.current) return;
    setSignature(canvasRef.current.toDataURL());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!signature || !acknowledged) {
      setError('Please sign and acknowledge the assessment');
      return;
    }

    setSubmitting(true);

    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      const { data, error: insertError } = await supabase
        .from('assessment_responses')
        .insert({
          assignment_id: assignmentId,
          employee_id: userData.id,
          responses: responses,
          signature_data: signature,
          checkbox_acknowledged: acknowledged,
          signed_date: new Date().toISOString()
        })
        .select();

      if (insertError) throw insertError;

      await supabase.from('assessment_assignments').update({ status: 'signed' }).eq('id', assignmentId);

      await logAudit(
        'assessment_signed',
        userData.id,
        assignmentId,
        'assessment_response',
        { assessment_type: assignment?.assessment_type, acknowledged: acknowledged }
      );

      router.push('/dashboard/employee/my-assessments');
    } catch (err) {
      console.error('Error submitting assessment:', err);
      setError('Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading assessment...</div>;
  if (!assignment) return <div className="p-8 text-center">Assessment not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>Complete Assessment</h1>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              {questions.map((q) => (
                <div key={q.id} className="p-4 border rounded-lg bg-gray-50">
                  <p className="font-semibold text-gray-800 mb-3">{q.text}</p>

                  {q.type === 'yes-no' && (
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input type="radio" value="yes" checked={responses[q.id] === 'yes'} onChange={() => updateResponse(q.id, 'yes')} className="mr-2" disabled={submitting} />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input type="radio" value="no" checked={responses[q.id] === 'no'} onChange={() => updateResponse(q.id, 'no')} className="mr-2" disabled={submitting} />
                        <span>No</span>
                      </label>
                    </div>
                  )}

                  {q.type === 'text' && (
                    <textarea value={responses[q.id] || ''} onChange={(e) => updateResponse(q.id, e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="Enter your response" rows={3} disabled={submitting} />
                  )}

                  {q.type === 'rating' && (
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button key={num} type="button" onClick={() => updateResponse(q.id, num)} disabled={submitting} className={`px-4 py-2 rounded-lg font-semibold ${responses[q.id] === num ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                          {num}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t pt-6">
              <h3 className="font-bold text-lg mb-4" style={{ color: '#f89939' }}>Digital Signature</h3>
              <canvas ref={canvasRef} width={600} height={180} onMouseDown={startSignature} className="border-2 border-gray-300 rounded-lg cursor-crosshair w-full" />
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={captureSignature} disabled={submitting} className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold">Capture Signature</button>
                <button type="button" onClick={clearSignature} disabled={submitting} className="px-4 py-2 bg-gray-400 text-white rounded-lg font-semibold">Clear</button>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="flex items-start cursor-pointer">
                <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mr-3 mt-1 w-4 h-4" disabled={submitting} />
                <span className="text-blue-900">I acknowledge that I have reviewed and understood this assessment and agree to comply with all requirements.</span>
              </label>
            </div>

            <button type="submit" disabled={submitting || !signature || !acknowledged} style={{ backgroundColor: '#f89939' }} className="w-full text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Complete & Sign Assessment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}