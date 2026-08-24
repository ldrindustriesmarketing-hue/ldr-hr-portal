'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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
  source?: string | null;
  rejection_reason?: string | null;
  signature_data: string | null;
  checkbox_acknowledged: boolean;
  signed_date: string | null;
}

export default function ViewRecordPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const recordId = params.id as string;
  const type = (searchParams.get('type') === 'certification' ? 'certification' : 'training') as RecordType;
  const table = type === 'training' ? 'training_records' : 'certifications';
  const router = useRouter();

  const [record, setRecord] = useState<RecordData | null>(null);
  const [employeeName, setEmployeeName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchRecord(JSON.parse(userData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId, type]);

  async function fetchRecord(user: { id: string; role: string; name: string }) {
    try {
      const { data, error: fetchError } = await supabase.from(table).select('*').eq('id', recordId).single();
      if (fetchError) throw fetchError;

      const isOwner = data.employee_id === user.id;
      const isManager = user.role === 'manager' || user.role === 'admin';
      if (!isOwner && !isManager) {
        setError('You do not have access to this record.');
        return;
      }

      setRecord(data);

      if (isOwner) {
        setEmployeeName(user.name);
      } else {
        const { data: empData } = await supabase.from('employees').select('name').eq('id', data.employee_id).single();
        setEmployeeName(empData?.name || 'Unknown');
      }
    } catch (err) {
      console.error('Error loading record:', err);
      setError('Failed to load record');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!record) return <div className="p-8 text-center">Record not found</div>;

  const signedDate = record.signed_date ? new Date(record.signed_date) : null;
  const isPendingReview = type === 'certification' && record.status === 'pending_review';
  const isRejected = type === 'certification' && record.status === 'rejected';
  const isSelfSubmitted = type === 'certification' && record.source === 'employee';
  const statusLabel = isPendingReview ? 'Pending Review' : isRejected ? 'Rejected' : isSelfSubmitted ? 'Approved' : 'Signed';

  return (
    <div className="min-h-screen bg-gray-50 p-6 print:bg-white print:p-0">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8 print:hidden">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{type === 'training' ? 'Training Record' : 'Certification'}</p>
            <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>{record.title}</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
            <button onClick={() => window.print()} style={{ backgroundColor: '#f89939' }} className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90">🖨️ Print / Save as PDF</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none print:p-0">
          <div className="hidden print:block mb-6 pb-4 border-b">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{type === 'training' ? 'Training Record' : 'Certification'}</p>
            <h2 className="text-2xl font-bold" style={{ color: '#f89939' }}>{record.title}</h2>
          </div>

          <div className="space-y-3 text-sm mb-6 pb-6 border-b">
            <p><span className="font-semibold text-gray-700">Employee:</span> <span className="text-gray-800">{employeeName}</span></p>
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

          <div>
            <h3 className="font-bold text-lg mb-4" style={{ color: '#f89939' }}>{isSelfSubmitted ? 'Employee Attestation' : 'Employee Acknowledgement'}</h3>

            {isPendingReview && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                <p className="text-yellow-900">⏳ This certification was submitted by the employee and is awaiting manager review before it's verified.</p>
              </div>
            )}

            {isRejected && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                <p className="text-red-900">❌ This submission was rejected{record.rejection_reason ? `: ${record.rejection_reason}` : '.'}</p>
              </div>
            )}

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg print:bg-white print:border-gray-300 mb-4">
              <p className="text-blue-900">
                {record.checkbox_acknowledged ? '✅' : '❌'}{' '}
                {type === 'training'
                  ? 'The employee acknowledged that they received and understood this on-the-job training.'
                  : isSelfSubmitted
                  ? 'The employee confirmed they hold this certification and that the details provided are genuine and accurate.'
                  : 'The employee acknowledged that this certification record is accurate.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 items-end">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Signature</p>
                {record.signature_data ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={record.signature_data} alt="Employee signature" className="border rounded-lg bg-white max-w-full" style={{ maxHeight: 120 }} />
                ) : (
                  <p className="text-gray-500">No signature captured</p>
                )}
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <p><span className="font-semibold">Signed by:</span> {employeeName}</p>
                {signedDate && <p><span className="font-semibold">Date:</span> {signedDate.toLocaleDateString()} {signedDate.toLocaleTimeString()}</p>}
                <p><span className="font-semibold">Status:</span> {statusLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
