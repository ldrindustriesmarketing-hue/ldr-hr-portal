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

export default function AddTrainingRecordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <AddTrainingRecordForm />
    </Suspense>
  );
}

function AddTrainingRecordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedEmployeeId = searchParams.get('employeeId') || '';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState(preselectedEmployeeId);
  const [title, setTitle] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const [trainingDate, setTrainingDate] = useState(() => new Date().toISOString().slice(0, 10));
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

    if (!employeeId || !title || !trainingDate) {
      setError('Please select an employee and fill in the title and date');
      return;
    }

    setSaving(true);
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      const { data, error: insertError } = await supabase
        .from('training_records')
        .insert({
          employee_id: employeeId,
          created_by: userData.id,
          title,
          trainer_name: trainerName || null,
          training_date: trainingDate,
          notes: notes || null,
          photo: photo || null,
          status: 'pending',
        })
        .select();

      if (insertError) throw insertError;

      await logAudit('training_record_created', userData.id, data[0].id, 'training_record', { employee_id: employeeId, title });

      router.push(`/dashboard/manager/employee-documents/${employeeId}`);
    } catch (err) {
      console.error('Error creating training record:', err);
      setError('Failed to create training record');
    } finally {
      setSaving(false);
    }
  }

  if (loadingData) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>Add Training Record</h1>
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
              <label className="block text-gray-700 font-semibold mb-2">Training Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="e.g., Forklift Operation - On the Job Training" required disabled={saving} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Trainer Name</label>
              <input type="text" value={trainerName} onChange={(e) => setTrainerName(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="Who conducted the training" disabled={saving} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Training Date *</label>
              <input type="date" value={trainingDate} onChange={(e) => setTrainingDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" required disabled={saving} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="What was covered, competency observed, etc." rows={4} disabled={saving} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Photo (optional)</label>
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
              {saving ? 'Saving...' : 'Add Training Record'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
