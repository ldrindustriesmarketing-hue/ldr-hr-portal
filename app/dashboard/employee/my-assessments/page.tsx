'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Assessment {
  id: string;
  title: string;
  description: string;
  type: 'risk' | 'chemical';
  content: any[];
  created_at: string;
  due_date: string | null;
  status: string;
  assignment_id: string;
}

export default function MyAssessmentsPage() {
  const [user, setUser] = useState<any>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      setUser(JSON.parse(userData));
      fetchAssignedAssessments(JSON.parse(userData).id);
    }
  }, [router]);

  async function fetchAssignedAssessments(userId: string) {
    try {
      // Fetch risk assessments
      const { data: riskAssignments, error: riskError } = await supabase
        .from('assessment_assignments')
        .select('id, assessment_id, due_date, status')
        .eq('assigned_to', userId)
        .eq('assessment_type', 'risk');

      if (riskError) throw riskError;

      // Fetch chemical assessments
      const { data: chemAssignments, error: chemError } = await supabase
        .from('assessment_assignments')
        .select('id, assessment_id, due_date, status')
        .eq('assigned_to', userId)
        .eq('assessment_type', 'chemical');

      if (chemError) throw chemError;

      const allAssignments = [...(riskAssignments || []), ...(chemAssignments || [])];

      // Fetch assessment details
      const assessmentsData: Assessment[] = [];

      for (const assignment of allAssignments) {
        const isRisk = riskAssignments?.some(a => a.id === assignment.id);
        const table = isRisk ? 'risk_assessments' : 'chemical_assessments';

        const { data: assessmentData, error: assessmentError } = await supabase
          .from(table)
          .select('id, title, description, content, created_at')
          .eq('id', assignment.assessment_id)
          .single();

        if (assessmentError) {
          console.error('Error fetching assessment:', assessmentError);
          continue;
        }

        assessmentsData.push({
          id: assessmentData.id,
          title: assessmentData.title,
          description: assessmentData.description,
          type: isRisk ? 'risk' : 'chemical',
          content: assessmentData.content || [],
          created_at: assessmentData.created_at,
          due_date: assignment.due_date,
          status: assignment.status,
          assignment_id: assignment.id
        });
      }

      setAssessments(assessmentsData);
    } catch (err) {
      console.error('Error fetching assessments:', err);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'signed':
        return 'bg-green-100 text-green-800';
      case 'acknowledged':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getTypeIcon(type: string) {
    return type === 'risk' ? '📋' : '🧪';
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  if (loading) return <div className="p-8 text-center">Loading assessments...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/dashboard/employee')}
          className="mb-6 text-gray-600 hover:text-gray-800 flex items-center"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold mb-2" style={{ color: '#f89939' }}>My Assessments</h1>
        <p className="text-gray-600 mb-6">View and complete your assigned assessments</p>

        {assessments.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-600">No assessments assigned yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assessments.map(assessment => (
              <div key={assessment.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(expandedId === assessment.id ? null : assessment.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getTypeIcon(assessment.type)}</span>
                        <h2 className="text-xl font-semibold text-gray-800">{assessment.title}</h2>
                      </div>
                      <p className="text-sm text-gray-600">{assessment.description}</p>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase">Due Date</p>
                          <p className="text-gray-700">{formatDate(assessment.due_date)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase">Questions</p>
                          <p className="text-gray-700">{assessment.content.length} question{assessment.content.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(assessment.status)}`}
                    >
                      {assessment.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === assessment.id && (
                  <div className="border-t p-6 bg-gray-50">
                    <h3 className="font-semibold text-gray-800 mb-4">Assessment Questions:</h3>
                    <div className="space-y-4 mb-6">
                      {assessment.content.length > 0 ? (
                        assessment.content.map((question: any, index: number) => (
                          <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                            <p className="font-semibold text-gray-800 mb-2">
                              {index + 1}. {question.text}
                            </p>
                            <p className="text-xs text-gray-500">
                              Type: <span className="font-medium">{question.type.replace('-', ' ')}</span>
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600">No questions in this assessment.</p>
                      )}
                    </div>

                    {assessment.status === 'pending' && (
                      <button
                        onClick={() => router.push(`/dashboard/employee/complete-assessment/${assessment.assignment_id}`)}
                        style={{ backgroundColor: '#f89939' }}
                        className="w-full text-white py-2 rounded-lg font-semibold hover:opacity-90"
                      >
                        Start Assessment →
                      </button>
                    )}

                    {assessment.status === 'in-progress' && (
                      <button
                        onClick={() => router.push(`/dashboard/employee/complete-assessment/${assessment.assignment_id}`)}
                        style={{ backgroundColor: '#f89939' }}
                        className="w-full text-white py-2 rounded-lg font-semibold hover:opacity-90"
                      >
                        Continue Assessment →
                      </button>
                    )}

                    {(assessment.status === 'signed' || assessment.status === 'acknowledged') && (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-green-700 font-semibold">✓ Assessment Completed</p>
                        <p className="text-sm text-green-600 mt-1">You have successfully completed this assessment.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}