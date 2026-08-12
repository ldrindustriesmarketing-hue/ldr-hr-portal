'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface SignedAssessment {
  id: string;
  employee_name: string;
  assessment_title: string;
  assessment_type: string;
  signed_date: string;
  status: string;
}

export default function ManagerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [signedAssessments, setSignedAssessments] = useState<SignedAssessment[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      setUser(JSON.parse(userData));
      fetchSignedAssessments();
    }
  }, [router]);

  async function fetchSignedAssessments() {
    try {
      // Fetch signed assignments
      const { data: assignments, error: assignError } = await supabase
        .from('assessment_assignments')
        .select('id, assessment_id, assessment_type, assigned_to, status')
        .eq('status', 'signed')
        .order('sent_date', { ascending: false });

      if (assignError) throw assignError;

      const assessmentsData: SignedAssessment[] = [];

      for (const assignment of assignments || []) {
        // Fetch employee name
        const { data: empData } = await supabase
          .from('employees')
          .select('name')
          .eq('id', assignment.assigned_to)
          .single();

        // Fetch assessment details
        const table = assignment.assessment_type === 'risk' ? 'risk_assessments' : 'chemical_assessments';
        const { data: assessData } = await supabase
          .from(table)
          .select('title')
          .eq('id', assignment.assessment_id)
          .single();

        // Fetch response with signed date
        const { data: responseData } = await supabase
          .from('assessment_responses')
          .select('signed_date')
          .eq('assignment_id', assignment.id)
          .single();

        assessmentsData.push({
          id: assignment.id,
          employee_name: empData?.name || 'Unknown',
          assessment_title: assessData?.title || 'Unknown Assessment',
          assessment_type: assignment.assessment_type,
          signed_date: responseData?.signed_date || new Date().toISOString(),
          status: assignment.status
        });
      }

      setSignedAssessments(assessmentsData);
    } catch (err) {
      console.error('Error fetching signed assessments:', err);
    } finally {
      setLoadingAssessments(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('user');
    router.push('/login');
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getTypeIcon(type: string) {
    return type === 'risk' ? '📋' : '🧪';
  }

  if (!user) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <Image 
            src="/ldr.logo.png" 
            alt="LDR Logo" 
            width={80} 
            height={80}
          />
          <button
            onClick={handleLogout}
            style={{ backgroundColor: '#f89939' }}
            className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90 transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-1" style={{ color: '#f89939' }}>Manager Dashboard</h1>
        <p className="text-gray-600 mb-8">Manage reports and assessments</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Quick Access */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {/* All Hazard Reports */}
              <div 
                className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
                onClick={() => router.push('/dashboard/manager/all-reports')}
              >
                <h3 className="font-semibold text-gray-800 mb-1">All Reports</h3>
                <p className="text-sm text-gray-600">View & manage</p>
                <p className="text-xs text-orange-500 mt-2">→</p>
              </div>

              {/* Audit Trail */}
              <div 
                className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
              >
                <h3 className="font-semibold text-gray-800 mb-1">Audit Trail</h3>
                <p className="text-sm text-gray-600">Activity log</p>
                <p className="text-xs text-orange-500 mt-2">→</p>
              </div>
            </div>
          </div>

          {/* Right Content - Main Actions */}
          <div className="lg:col-span-2 space-y-8">
            {/* Section 1: Create Assessments */}
            <div className="bg-white p-8 rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#f89939' }}>Create Assessments</h2>
              <p className="text-gray-600 mb-6">Build new safety assessments for employees</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Create Risk Assessment */}
                <div 
                  className="border-2 border-gray-200 p-6 rounded-lg hover:border-orange-400 hover:shadow-lg transition cursor-pointer text-center"
                  onClick={() => router.push('/dashboard/manager/create-risk-assessment')}
                >
                  <div className="text-4xl mb-3">📋</div>
                  <h3 className="font-semibold text-gray-800 mb-2">Create Risk Assessment</h3>
                  <p className="text-sm text-gray-600">Identify workplace risks and hazards</p>
                  <p className="text-sm text-orange-500 font-semibold mt-4">→ Create</p>
                </div>

                {/* Create Chemical Assessment */}
                <div 
                  className="border-2 border-gray-200 p-6 rounded-lg hover:border-orange-400 hover:shadow-lg transition cursor-pointer text-center"
                  onClick={() => router.push('/dashboard/manager/create-chemical-assessment')}
                >
                  <div className="text-4xl mb-3">🧪</div>
                  <h3 className="font-semibold text-gray-800 mb-2">Create Chemical Assessment</h3>
                  <p className="text-sm text-gray-600">Assess chemical hazards and substances</p>
                  <p className="text-sm text-orange-500 font-semibold mt-4">→ Create</p>
                </div>
              </div>
            </div>

            {/* Section 2: Manage Assessments */}
            <div className="bg-white p-8 rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#f89939' }}>Manage Assessments</h2>
              <p className="text-gray-600 mb-6">Assign assessments to employees and track completion</p>

              <div 
                className="border-2 border-gray-200 p-6 rounded-lg hover:border-orange-400 hover:shadow-lg transition cursor-pointer text-center"
                onClick={() => router.push('/dashboard/manager/assign-assessments')}
              >
                <div className="text-4xl mb-3">👥</div>
                <h3 className="font-semibold text-gray-800 mb-2">Assign Assessments</h3>
                <p className="text-sm text-gray-600">Send assessments to employees and set due dates</p>
                <p className="text-sm text-orange-500 font-semibold mt-4">→ Assign</p>
              </div>
            </div>

            {/* Section 3: Signed Assessments */}
            <div className="bg-white p-8 rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#f89939' }}>Signed Assessments</h2>
              <p className="text-gray-600 mb-6">View completed and signed assessments</p>

              {loadingAssessments ? (
                <p className="text-gray-600">Loading signed assessments...</p>
              ) : signedAssessments.length === 0 ? (
                <p className="text-gray-600">No signed assessments yet.</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {signedAssessments.map(assessment => (
                    <div key={assessment.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{getTypeIcon(assessment.assessment_type)}</span>
                            <p className="font-semibold text-gray-800">{assessment.assessment_title}</p>
                          </div>
                          <p className="text-sm text-gray-600">By: <span className="font-semibold">{assessment.employee_name}</span></p>
                          <p className="text-xs text-gray-500 mt-1">Signed: {formatDate(assessment.signed_date)}</p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">✓ Signed</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 4: Quick Stats */}
            <div className="bg-white p-8 rounded-lg shadow">
              <h3 className="font-semibold text-gray-800 mb-4">Quick Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Hazard Reports</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">0</p>
                  <button 
                    onClick={() => router.push('/dashboard/manager/all-reports')}
                    className="text-sm text-blue-600 font-semibold mt-2 hover:underline"
                  >
                    View All →
                  </button>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">Pending Action</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">0</p>
                  <button 
                    onClick={() => router.push('/dashboard/manager/all-reports')}
                    className="text-sm text-yellow-600 font-semibold mt-2 hover:underline"
                  >
                    Review →
                  </button>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Assessments Signed</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{signedAssessments.length}</p>
                  <button 
                    className="text-sm text-green-600 font-semibold mt-2 hover:underline"
                  >
                    View All →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}