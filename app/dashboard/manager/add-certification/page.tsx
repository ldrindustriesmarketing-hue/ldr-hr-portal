'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';
import { compressImageFile } from '@/lib/image';

interface Employee {
  id: string;
  name: string;
}

export default function AddCertificationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <AddCertificationForm />
    </Suspense>
  );
}

function AddCertificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedEmployeeId = searchParams.get('employeeId') || '';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState(preselectedEmployeeId);
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function fetchEmployees() {
    try {
      setLoadingData(true);
      const { data, error: fetchError } = await supabase.from('employees').select('id, name').order('name', { ascending: true });
      if (fetchError) throw fetchError;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoadingData(false);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhotoUploading(true);
      const dataUrl = await compressImageFile(file);
      setPhoto(dataUrl);
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

    if (!employeeId || !title) {
      setError('Please select an employee and enter a title');
      return;
    }

    setSaving(true);
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      const { data, error: insertError } = await supabase
        .from('certifications')
        .insert({
          employee_id: employeeId,
          created_by: userData.id,
          title,
          issuer: issuer || null,
          issue_date: issueDate || null,
          expiry_date: expiryDate || null,
          notes: notes || null,
          photo: photo || null,
          status: 'pending',
        })
        .select();

      if (insertError) throw insertError;

      await logAudit('certification_created', userData.id, data[0].id, 'certification', { employee_id: employeeId, title });

      router.push(`/dashboard/manager/employee-documents/${employeeId}`);
    } catch (err) {
      console.error('Error creating certification:', err);
      setError('Failed to create certification');
    } finally {
      setSaving(false);
    }
  }

  if (loadingData) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>Add Certification</h1>
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
              <label className="block text-gray-700 font-semibold mb-2">Employee *</label>
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" required disabled={saving}>
                <option value="">-- Choose Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Certification Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="e.g., Forklift License, First Aid Certificate" required disabled={saving} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Issuer</label>
              <input type="text" value={issuer} onChange={(e) => setIssuer(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="Issuing body / provider" disabled={saving} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Issue Date</label>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" disabled={saving} />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Expiry Date (optional)</label>
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" disabled={saving} />
                <p className="text-xs text-gray-500 mt-1">Leave blank if this certification doesn't expire.</p>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="Additional details" rows={4} disabled={saving} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Photo / Scan (optional)</label>
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="w-full px-4 py-2 border rounded-lg" disabled={saving || photoUploading} />
              {photoUploading && <p className="text-sm text-gray-500 mt-2">Processing photo...</p>}
              {photo && (
                <div className="mt-4 relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="Preview" className="rounded-lg border max-h-64" />
                  <button type="button" onClick={() => setPhoto('')} className="absolute top-2 right-2 bg-white/90 text-red-600 rounded-full w-7 h-7 font-bold hover:bg-white" disabled={saving}>✕</button>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500">This record will be sent to the employee to review and sign off before it's marked complete.</p>

            <button type="submit" disabled={saving} style={{ backgroundColor: '#f89939' }} className="w-full text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Certification'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
