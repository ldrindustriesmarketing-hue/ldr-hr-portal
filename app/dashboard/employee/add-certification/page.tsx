'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';
import { fileToDataUrl, compressImageFile } from '@/lib/image';

export default function AddOwnCertificationPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState('');
  const [photoFileName, setPhotoFileName] = useState('');
  const [fileUploading, setFileUploading] = useState(false);

  const [signature, setSignature] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    }
  }, [router]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setFileUploading(true);
      const dataUrl = file.type.startsWith('image/') ? await compressImageFile(file) : await fileToDataUrl(file);
      setPhoto(dataUrl);
      setPhotoFileName(file.name);
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Failed to process the file');
    } finally {
      setFileUploading(false);
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

    if (!title.trim()) {
      setError('Please enter a certification title');
      return;
    }
    if (!signature || !acknowledged) {
      setError('Please sign and confirm the attestation before submitting');
      return;
    }

    setSubmitting(true);
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      const { data, error: insertError } = await supabase
        .from('certifications')
        .insert({
          employee_id: userData.id,
          created_by: userData.id,
          source: 'employee',
          title,
          issuer: issuer || null,
          issue_date: issueDate || null,
          expiry_date: expiryDate || null,
          notes: notes || null,
          photo: photo || null,
          status: 'pending_review',
          signature_data: signature,
          checkbox_acknowledged: acknowledged,
          signed_date: new Date().toISOString(),
        })
        .select();

      if (insertError) throw insertError;

      await logAudit('certification_submitted', userData.id, data[0].id, 'certification', { title });

      router.push('/dashboard/employee/my-certifications');
    } catch (err) {
      console.error('Error submitting certification:', err);
      setError('Failed to submit certification');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>Upload My Certification</h1>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
            Submit a licence or certification you already hold (e.g. a forklift licence, first aid certificate). It will show as <strong>Pending Review</strong> until a manager verifies it.
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Certification Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="e.g., Forklift Licence" required disabled={submitting} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Issuer</label>
              <input type="text" value={issuer} onChange={(e) => setIssuer(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="Issuing body / training provider" disabled={submitting} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Issue Date</label>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" disabled={submitting} />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Expiry Date (optional)</label>
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" disabled={submitting} />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" rows={3} disabled={submitting} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Certificate / Licence File</label>
              <input type="file" accept="application/pdf,image/*" onChange={handleFileChange} className="w-full px-4 py-2 border rounded-lg" disabled={submitting || fileUploading} />
              {fileUploading && <p className="text-sm text-gray-500 mt-2">Processing file...</p>}
              {photo && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-sm text-gray-700">📎 {photoFileName}</span>
                  <button type="button" onClick={() => { setPhoto(''); setPhotoFileName(''); }} className="text-red-600 text-sm font-semibold hover:text-red-800" disabled={submitting}>Remove</button>
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
                <span className="text-blue-900">I confirm that I currently hold this certification/licence and that the details provided are genuine and accurate.</span>
              </label>
            </div>

            <button type="submit" disabled={submitting || fileUploading || !signature || !acknowledged} style={{ backgroundColor: '#f89939' }} className="w-full text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
