'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface TrainingRecord {
  id: string;
  title: string;
  trainer_name: string | null;
  training_date: string;
  status: string;
}

export default function MyTrainingPage() {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchRecords(JSON.parse(userData).id);
  }, [router]);

  async function fetchRecords(userId: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('training_records')
        .select('id, title, trainer_name, training_date, status')
        .eq('employee_id', userId)
        .order('training_date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching training records:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>My Training Records</h1>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {loading ? (
            <p className="text-gray-600">Loading training records...</p>
          ) : records.length === 0 ? (
            <p className="text-gray-600">No training records yet.</p>
          ) : (
            <div className="space-y-3">
              {records.map((r) => (
                <div key={r.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-800">{r.title}</p>
                    <p className="text-sm text-gray-600">{r.trainer_name ? `Trainer: ${r.trainer_name} · ` : ''}{new Date(r.training_date).toLocaleDateString()}</p>
                    <span className={`text-xs font-bold px-2 py-1 rounded mt-2 inline-block ${r.status === 'signed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {r.status.toUpperCase()}
                    </span>
                  </div>
                  {r.status === 'pending' ? (
                    <a href={`/dashboard/employee/sign-record/${r.id}?type=training`} style={{ backgroundColor: '#f89939' }} className="px-4 py-2 text-white rounded-lg font-semibold hover:opacity-90 text-sm whitespace-nowrap">Review & Sign</a>
                  ) : (
                    <a href={`/dashboard/employee/view-record/${r.id}?type=training`} className="px-4 py-2 bg-gray-700 text-white rounded-lg font-semibold hover:opacity-90 text-sm whitespace-nowrap">View</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
