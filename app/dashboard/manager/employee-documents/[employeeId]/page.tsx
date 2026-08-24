'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
}

interface WhsAssignment {
  id: string;
  assessment_type: 'risk' | 'chemical';
  assessment_id: string;
  status: string;
  due_date: string;
  title?: string;
}

interface TrainingRecord {
  id: string;
  title: string;
  trainer_name: string;
  training_date: string;
  status: string;
}

interface Certification {
  id: string;
  title: string;
  issuer: string;
  issue_date: string;
  expiry_date: string | null;
  status: string;
}

function expiryInfo(expiryDate: string | null) {
  if (!expiryDate) return null;
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: 'Expired', color: 'bg-red-100 text-red-800' };
  if (days <= 30) return { label: `Expires in ${days}d`, color: 'bg-yellow-100 text-yellow-800' };
  return { label: 'Valid', color: 'bg-green-100 text-green-800' };
}

export default function EmployeeDocumentsDetailPage() {
  const params = useParams();
  const employeeId = params.employeeId as string;
  const router = useRouter();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [whs, setWhs] = useState<WhsAssignment[]>([]);
  const [training, setTraining] = useState<TrainingRecord[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  async function fetchAll() {
    try {
      setLoading(true);

      const { data: empData, error: empError } = await supabase.from('employees').select('id, name, email, department').eq('id', employeeId).single();
      if (empError) throw empError;
      setEmployee(empData);

      const { data: assignData, error: assignError } = await supabase
        .from('assessment_assignments')
        .select('*')
        .eq('assigned_to', employeeId)
        .order('due_date', { ascending: false });
      if (assignError) throw assignError;

      const assignments: WhsAssignment[] = assignData || [];
      const riskIds = assignments.filter((a) => a.assessment_type === 'risk').map((a) => a.assessment_id);
      const chemicalIds = assignments.filter((a) => a.assessment_type === 'chemical').map((a) => a.assessment_id);

      const [riskTitles, chemicalTitles] = await Promise.all([
        riskIds.length ? supabase.from('risk_assessments').select('id, title').in('id', riskIds) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
        chemicalIds.length ? supabase.from('chemical_assessments').select('id, title').in('id', chemicalIds) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
      ]);
      const titleMap = new Map<string, string>();
      (riskTitles.data || []).forEach((t) => titleMap.set(t.id, t.title));
      (chemicalTitles.data || []).forEach((t) => titleMap.set(t.id, t.title));
      setWhs(assignments.map((a) => ({ ...a, title: titleMap.get(a.assessment_id) })));

      const { data: trainingData, error: trainingError } = await supabase
        .from('training_records')
        .select('id, title, trainer_name, training_date, status')
        .eq('employee_id', employeeId)
        .order('training_date', { ascending: false });
      if (trainingError) throw trainingError;
      setTraining(trainingData || []);

      const { data: certData, error: certError } = await supabase
        .from('certifications')
        .select('id, title, issuer, issue_date, expiry_date, status')
        .eq('employee_id', employeeId)
        .order('issue_date', { ascending: false });
      if (certError) throw certError;
      setCertifications(certData || []);
    } catch (err) {
      console.error('Error loading employee documents:', err);
      setError('Failed to load employee documents');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteWhs(a: WhsAssignment) {
    const warning = a.status === 'signed'
      ? `"${a.title}" has already been signed. Deleting this will also permanently delete the signed record and signature. This cannot be undone. Continue?`
      : `Remove "${a.title}" from this employee's assigned assessments? This cannot be undone.`;
    if (!confirm(warning)) return;

    try {
      if (a.status === 'signed') {
        const { error: responseError } = await supabase.from('assessment_responses').delete().eq('assignment_id', a.id);
        if (responseError) throw responseError;
      }
      const { error: deleteError } = await supabase.from('assessment_assignments').delete().eq('id', a.id);
      if (deleteError) throw deleteError;

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      await logAudit('assignment_deleted', userData.id, a.id, 'assessment_assignment', { employee_id: employeeId, title: a.title, status: a.status });

      await fetchAll();
    } catch (err) {
      console.error('Error deleting assignment:', err);
      alert('Failed to delete assignment');
    }
  }

  async function handleDeleteTraining(t: TrainingRecord) {
    if (!confirm(`Delete training record "${t.title}"? ${t.status === 'signed' ? 'It has already been signed by the employee. ' : ''}This cannot be undone.`)) return;

    try {
      const { error: deleteError } = await supabase.from('training_records').delete().eq('id', t.id);
      if (deleteError) throw deleteError;

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      await logAudit('training_record_deleted', userData.id, t.id, 'training_record', { employee_id: employeeId, title: t.title, status: t.status });

      await fetchAll();
    } catch (err) {
      console.error('Error deleting training record:', err);
      alert('Failed to delete training record');
    }
  }

  async function handleDeleteCertification(c: Certification) {
    if (!confirm(`Delete certification "${c.title}"? ${c.status === 'signed' ? 'It has already been signed by the employee. ' : ''}This cannot be undone.`)) return;

    try {
      const { error: deleteError } = await supabase.from('certifications').delete().eq('id', c.id);
      if (deleteError) throw deleteError;

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      await logAudit('certification_deleted', userData.id, c.id, 'certification', { employee_id: employeeId, title: c.title, status: c.status });

      await fetchAll();
    } catch (err) {
      console.error('Error deleting certification:', err);
      alert('Failed to delete certification');
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error || !employee) return <div className="p-8 text-center text-red-600">{error || 'Employee not found'}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Employee Documents</p>
            <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>{employee.name}</h1>
            <p className="text-gray-600 text-sm mt-1">{employee.email} · {employee.department}</p>
          </div>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#f89939' }}>WHS Documents</h2>
            {whs.length === 0 ? (
              <p className="text-gray-600">No risk or chemical assessments assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {whs.map((a) => (
                  <div key={a.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-800">{a.title || 'Untitled Assessment'}</p>
                      <p className="text-xs text-gray-500 uppercase">{a.assessment_type === 'risk' ? 'Risk Assessment' : 'Chemical Assessment'} · Due {new Date(a.due_date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${a.status === 'signed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{a.status.toUpperCase()}</span>
                      {a.status === 'signed' && (
                        <a href={`/dashboard/employee/view-assessment/${a.id}`} style={{ backgroundColor: '#f89939' }} className="px-3 py-1.5 text-white rounded-lg font-semibold hover:opacity-90 text-xs whitespace-nowrap">View Signed Copy</a>
                      )}
                      <button onClick={() => handleDeleteWhs(a)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-semibold hover:opacity-90 text-xs whitespace-nowrap">🗑️ Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#f89939' }}>Training Records</h2>
              <a href={`/dashboard/manager/add-training-record?employeeId=${employeeId}`} style={{ backgroundColor: '#f89939' }} className="px-4 py-2 text-white rounded-lg font-semibold hover:opacity-90 text-sm">➕ Add Training Record</a>
            </div>
            {training.length === 0 ? (
              <p className="text-gray-600">No training records yet.</p>
            ) : (
              <div className="space-y-2">
                {training.map((t) => (
                  <div key={t.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-800">{t.title}</p>
                      <p className="text-xs text-gray-500">{t.trainer_name ? `Trainer: ${t.trainer_name} · ` : ''}{new Date(t.training_date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${t.status === 'signed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{t.status.toUpperCase()}</span>
                      {t.status === 'signed' && (
                        <a href={`/dashboard/employee/view-record/${t.id}?type=training`} style={{ backgroundColor: '#f89939' }} className="px-3 py-1.5 text-white rounded-lg font-semibold hover:opacity-90 text-xs whitespace-nowrap">View</a>
                      )}
                      <button onClick={() => handleDeleteTraining(t)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-semibold hover:opacity-90 text-xs whitespace-nowrap">🗑️ Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#f89939' }}>Certifications</h2>
              <a href={`/dashboard/manager/add-certification?employeeId=${employeeId}`} style={{ backgroundColor: '#f89939' }} className="px-4 py-2 text-white rounded-lg font-semibold hover:opacity-90 text-sm">➕ Add Certification</a>
            </div>
            {certifications.length === 0 ? (
              <p className="text-gray-600">No certifications recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {certifications.map((c) => {
                  const expiry = expiryInfo(c.expiry_date);
                  return (
                    <div key={c.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-800">{c.title}</p>
                        <p className="text-xs text-gray-500">
                          {c.issuer ? `${c.issuer} · ` : ''}Issued {c.issue_date ? new Date(c.issue_date).toLocaleDateString() : '—'}
                          {c.expiry_date ? ` · Expires ${new Date(c.expiry_date).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {expiry && <span className={`text-xs font-bold px-2 py-1 rounded ${expiry.color}`}>{expiry.label}</span>}
                        <span className={`text-xs font-bold px-2 py-1 rounded ${c.status === 'signed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{c.status.toUpperCase()}</span>
                        {c.status === 'signed' && (
                          <a href={`/dashboard/employee/view-record/${c.id}?type=certification`} style={{ backgroundColor: '#f89939' }} className="px-3 py-1.5 text-white rounded-lg font-semibold hover:opacity-90 text-xs whitespace-nowrap">View</a>
                        )}
                        <button onClick={() => handleDeleteCertification(c)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-semibold hover:opacity-90 text-xs whitespace-nowrap">🗑️ Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
