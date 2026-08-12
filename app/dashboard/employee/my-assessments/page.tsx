'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

interface Assignment {
  id: string;
  assessment_id: string;
  assessment_type: 'risk' | 'chemical';
  due_date: string;
  status: string;
  assessment_title?: string;
}

export default function MyAssessmentsPage() {
  const [assessments, setAssessments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    logAudit(
      'assessments_viewed',
      user.id,
      user.id,
      'my_assessments',
      { timestamp: new Date().toISOString() }
    );

    fetchAssessments(user.id);
  }, [router]);

  async function fetchAssessments(userId: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assessment_assignments')
        .select('*')
        .eq('assigned_to', userId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setAssessments(data || []);
    } catch (err) {
      console.error('Error fetching assessments:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>My Assessments</h1>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {loading ? (
            <p className="text-gray-600">Loading assessments...</p>
          ) : assessments.length === 0 ? (
            <p className="text-gray-600">No assessments assigned to you</p>
          ) : (
            <div className="space-y-4">
              {assessments.map((assignment) => (
                <div key={assignment.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{assignment.assessment_type === 'risk' ? 'Risk' : 'Chemical'} Assessment</p>
                      <p className="text-sm text-gray-600">Due: {new Date(assignment.due_date).toLocaleDateString()}</p>
                      <span className={`text-xs font-bold px-2 py-1 rounded mt-2 inline-block ${assignment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : assignment.status === 'signed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {assignment.status.toUpperCase()}
                      </span>
                    </div>
                    <button onClick={() => setExpandedId(expandedId === assignment.id ? null : assignment.id)} className="text-gray-600 hover:text-gray-800 font-semibold">
                      {expandedId === assignment.id ? '▼' : '▶'}
                    </button>
                  </div>

                  {expandedId === assignment.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <p className="text-gray-600 text-sm">Assessment Type: {assignment.assessment_type === 'risk' ? 'Risk Assessment' : 'Chemical Assessment'}</p>
                      <p className="text-gray-600 text-sm">Status: {assignment.status}</p>

                      {assignment.status === 'pending' && (
                        <a href={`/dashboard/employee/complete-assessment/${assignment.id}`} style={{ backgroundColor: '#f89939' }} className="block px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90 text-center">
                          Start Assessment
                        </a>
                      )}

                      {assignment.status === 'signed' && (
                        <p className="text-green-600 font-semibold">✓ Assessment completed and signed</p>
                      )}
                    </div>
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