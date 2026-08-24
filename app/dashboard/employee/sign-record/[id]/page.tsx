'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

type RecordType = 'training' | 'certification';

interface RecordData {
  id: string;
  employee_id: string;
  title: string;
  trainer_name?: string | null;
  training_date?: string | null;
  issuer?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  notes: string | null;
  photo: string | null;
  status: string;
}

export default function SignRecordPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const recordId = params.id as string;
  const type = (searchParams.get('type') === 'certification' ? 'certification' : 'training') as RecordType;
  const table = type === 'training' ? 'training_records' : 'certifications';
  const router = useRouter();

  const [record, setRecord] = useState<RecordData | null>(null);
  const [signature, setSignature] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchRecord(JSON.parse(userData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId, type]);

  async function fetchRecord(user: { id: string }) {
    try {
      const { data, error: fetchError } = await supabase.from(table).select('*').eq('id', recordId).single();
      if (fetchError) throw fetchError;

      if (data.employee_id !== user.id) {
        setError('You do not have access to this record.');
        return;
      }

      setRecord(data);
    } catch (err) {
      console.error('Error loading record:', err);
      setError('Failed to load record');
    } finally {
      setLoading(false);
    }
  }

  function getCanvasPoint(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function beginStroke(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    const point = getCanvasPoint(clientX, clientY);
    if (!canvas || !point) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function continueStroke(clientX: number, clientY: number) {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const point = getCanvasPoint(clientX, clientY);
    if (!canvas || !point) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function endStroke() {
    isDrawingRef.current = false;
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    beginStroke(e.clientX, e.clientY);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    continueStroke(e.clientX, e.clientY);
  }

  function handleTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) beginStroke(touch.clientX, touch.clientY);
  }

  function handleTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) continueStroke(touch.clientX, touch.clientY);
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
      setError('Please sign and acknowledge this record');
      return;
    }

    setSubmitting(true);
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      const { error: updateError } = await supabase
        .from(table)
        .update({
          status: 'signed',
          signature_data: signature,
          checkbox_acknowledged: acknowledged,
          signed_date: new Date().toISOString(),
        })
        .eq('id', recordId);

      if (updateError) throw updateError;

      await logAudit(
        type === 'training' ? 'training_record_signed' : 'certification_signed',
        userData.id,
        recordId,
        type === 'training' ? 'training_record' : 'certification',
        { acknowledged }
      );

      router.push(type === 'training' ? '/dashboard/employee/my-training' : '/dashboard/employee/my-certifications');
    } catch (err) {
      console.error('Error signing record:', err);
      setError('Failed to submit signature');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!record) return <div className="p-8 text-center">Record not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{type === 'training' ? 'Training Record' : 'Certification'}</p>
            <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>{record.title}</h1>
          </div>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3 text-sm">
              {type === 'training' ? (
                <>
                  {record.trainer_name && <p><span className="font-semibold text-gray-700">Trainer:</span> <span className="text-gray-800">{record.trainer_name}</span></p>}
                  {record.training_date && <p><span className="font-semibold text-gray-700">Date:</span> <span className="text-gray-800">{new Date(record.training_date).toLocaleDateString()}</span></p>}
                </>
              ) : (
                <>
                  {record.issuer && <p><span className="font-semibold text-gray-700">Issuer:</span> <span className="text-gray-800">{record.issuer}</span></p>}
                  {record.issue_date && <p><span className="font-semibold text-gray-700">Issue Date:</span> <span className="text-gray-800">{new Date(record.issue_date).toLocaleDateString()}</span></p>}
                  {record.expiry_date && <p><span className="font-semibold text-gray-700">Expiry Date:</span> <span className="text-gray-800">{new Date(record.expiry_date).toLocaleDateString()}</span></p>}
                </>
              )}
              {record.notes && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Notes</p>
                  <p className="text-gray-800 whitespace-pre-wrap">{record.notes}</p>
                </div>
              )}
              {record.photo && (
                <div>
                  <p className="font-semibold text-gray-700 mb-2">Photo</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={record.photo} alt="Attached" className="rounded-lg border max-h-64" />
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="font-bold text-lg mb-4" style={{ color: '#f89939' }}>Digital Signature</h3>
              <canvas
                ref={canvasRef}
                width={600}
                height={180}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={endStroke}
                onMouseLeave={endStroke}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={endStroke}
                className="border-2 border-gray-300 rounded-lg cursor-crosshair w-full touch-none"
              />
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={captureSignature} disabled={submitting} className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold">Capture Signature</button>
                <button type="button" onClick={clearSignature} disabled={submitting} className="px-4 py-2 bg-gray-400 text-white rounded-lg font-semibold">Clear</button>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="flex items-start cursor-pointer">
                <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mr-3 mt-1 w-4 h-4" disabled={submitting} />
                <span className="text-blue-900">
                  {type === 'training'
                    ? 'I acknowledge that I received and understood this on-the-job training.'
                    : 'I acknowledge that this certification record is accurate.'}
                </span>
              </label>
            </div>

            <button type="submit" disabled={submitting || !signature || !acknowledged} style={{ backgroundColor: '#f89939' }} className="w-full text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Sign & Confirm'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
