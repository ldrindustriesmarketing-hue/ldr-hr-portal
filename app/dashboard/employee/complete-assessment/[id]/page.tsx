'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Script from 'next/script';
import { supabase } from '@/lib/supabase';

interface Question {
  id: string;
  text: string;
  type: 'yes-no' | 'text' | 'rating';
}

interface Answer {
  [key: string]: string | number;
}

export default function CompleteAssessmentPage() {
  const params = useParams();
  const assignmentId = params.id as string;
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [assessment, setAssessment] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer>({});
  const [acknowledged, setAcknowledged] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      setUser(JSON.parse(userData));
      fetchAssessmentDetails(assignmentId, JSON.parse(userData).id);
    }
  }, [assignmentId, router]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 600;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, []);

  async function fetchAssessmentDetails(assignmentId: string, userId: string) {
    try {
      // Fetch assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assessment_assignments')
        .select('assessment_id, assessment_type')
        .eq('id', assignmentId)
        .eq('assigned_to', userId)
        .single();

      if (assignmentError) throw assignmentError;

      // Fetch assessment
      const table = assignmentData.assessment_type === 'risk' ? 'risk_assessments' : 'chemical_assessments';
      const { data: assessmentData, error: assessmentError } = await supabase
        .from(table)
        .select('*')
        .eq('id', assignmentData.assessment_id)
        .single();

      if (assessmentError) throw assessmentError;

      setAssessment(assessmentData);
      setQuestions(assessmentData.content || []);
    } catch (err) {
      console.error('Error fetching assessment:', err);
      alert('Failed to load assessment');
      router.push('/dashboard/employee/my-assessments');
    } finally {
      setLoading(false);
    }
  }

  function handleAnswerChange(questionId: string, value: string | number) {
    setAnswers({
      ...answers,
      [questionId]: value
    });
  }

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }

  function stopDrawing() {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.closePath();
      }
      setSignatureData(canvas.toDataURL('image/png'));
    }
    setIsDrawing(false);
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
      setSignatureData(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!acknowledged) {
      alert('Please acknowledge that you have read and understood this assessment');
      return;
    }

    if (!signatureData) {
      alert('Please provide your digital signature');
      return;
    }

    setSubmitting(true);

    try {
      if (!user) {
        router.push('/login');
        return;
      }

      // Store responses
      const { error: responseError } = await supabase
        .from('assessment_responses')
        .insert([
          {
            assignment_id: assignmentId,
            employee_id: user.id,
            checkbox_acknowledged: acknowledged,
            signature_data: signatureData,
            signed_date: new Date().toISOString(),
            responses: answers
          }
        ]);

      if (responseError) throw responseError;

      // Update assignment status
      const { error: updateError } = await supabase
        .from('assessment_assignments')
        .update({ status: 'signed' })
        .eq('id', assignmentId);

      if (updateError) throw updateError;

      // Send emails to managers
      try {
        const { data: managers } = await supabase
          .from('employees')
          .select('email, name')
          .in('role', ['manager', 'admin']);

        for (const manager of managers || []) {
          await fetch('/api/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'assessment-signed',
              managerEmail: manager.email,
              managerName: manager.name,
              employeeName: user?.name || 'Employee',
              assessmentTitle: assessment?.title || 'Assessment'
            })
          });
        }
      } catch (emailError) {
        console.error('Email send error:', emailError);
      }

      setSuccess(true);

      setTimeout(() => {
        router.push('/dashboard/employee/my-assessments');
      }, 2000);
    } catch (err: any) {
      console.error('Error submitting assessment:', err);
      alert(`Failed to submit assessment: ${err.message}`);
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#f89939' }}>
            Assessment Signed
          </h1>
          <p className="text-gray-600 mb-4">
            Your assessment has been successfully submitted and signed. Management has been notified.
          </p>
          <p className="text-sm text-gray-500">Redirecting to assessments...</p>
        </div>
      </div>
    );
  }

  if (loading || !assessment) return <div className="p-8 text-center">Loading assessment...</div>;

  return (
    <>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" />

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/dashboard/employee/my-assessments')}
            className="mb-6 text-gray-600 hover:text-gray-800 flex items-center font-semibold"
          >
            ← Back to Assessments
          </button>

          <div className="bg-white p-8 rounded-lg shadow">
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#f89939' }}>
              {assessment.title}
            </h1>
            <p className="text-gray-600 mb-6">{assessment.description}</p>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Questions */}
              <div className="pt-6 border-t">
                <h2 className="text-2xl font-bold mb-6" style={{ color: '#f89939' }}>
                  Assessment Questions
                </h2>

                {questions.map((question: Question, index: number) => (
                  <div key={question.id} className="mb-8 p-6 bg-gray-50 rounded-lg">
                    <p className="font-semibold text-gray-800 mb-4">
                      {index + 1}. {question.text}
                    </p>

                    {/* Yes/No */}
                    {question.type === 'yes-no' && (
                      <div className="flex gap-6">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={question.id}
                            value="yes"
                            checked={answers[question.id] === 'yes'}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="mr-2"
                            disabled={submitting}
                          />
                          <span className="text-gray-700">Yes</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={question.id}
                            value="no"
                            checked={answers[question.id] === 'no'}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="mr-2"
                            disabled={submitting}
                          />
                          <span className="text-gray-700">No</span>
                        </label>
                      </div>
                    )}

                    {/* Text */}
                    {question.type === 'text' && (
                      <textarea
                        value={(answers[question.id] as string) || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-orange-500"
                        placeholder="Enter your answer..."
                        rows={3}
                        disabled={submitting}
                      />
                    )}

                    {/* Rating */}
                    {question.type === 'rating' && (
                      <div className="flex gap-4">
                        {[1, 2, 3, 4, 5].map(rating => (
                          <label key={rating} className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name={question.id}
                              value={rating}
                              checked={answers[question.id] === rating}
                              onChange={(e) => handleAnswerChange(question.id, parseInt(e.target.value))}
                              className="mr-2"
                              disabled={submitting}
                            />
                            <span className="text-gray-700 font-semibold text-lg">{rating}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Digital Signature */}
              <div className="pt-6 border-t">
                <h2 className="text-xl font-bold mb-4" style={{ color: '#f89939' }}>
                  Digital Signature
                </h2>
                <p className="text-gray-600 mb-4">
                  Please sign below to confirm you have read and understood this assessment:
                </p>

                <div className="mb-4 p-2 border-2 border-gray-300 rounded-lg bg-white">
                  <canvas
                    ref={canvasRef}
                    className="w-full border border-gray-300 rounded cursor-crosshair bg-white block"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                </div>

                <div className="flex gap-3 mb-4">
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition"
                    disabled={submitting}
                  >
                    Clear Signature
                  </button>
                  {signatureData && (
                    <div className="flex items-center text-green-600 font-semibold">
                      ✓ Signature captured
                    </div>
                  )}
                </div>
              </div>

              {/* Acknowledgment */}
              <div className="pt-6 border-t">
                <label className="flex items-start p-4 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="mr-3 mt-1"
                    disabled={submitting}
                  />
                  <span className="text-gray-700">
                    I acknowledge that I have read and understood this assessment. I certify that my answers are true and accurate to the best of my knowledge.
                  </span>
                </label>
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  disabled={submitting || !acknowledged || !signatureData}
                  style={{ backgroundColor: '#f89939' }}
                  className="flex-1 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting & Sending Notifications...' : 'Submit & Sign Assessment'}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/employee/my-assessments')}
                  className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition"
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </form>

            {/* Info Box */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Once you submit and sign this assessment, notification emails will be sent to management confirming your completion.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}