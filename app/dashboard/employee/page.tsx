'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function EmployeeDashboard() {
  const [user, setUser] = useState<any>(null);
  const [pendingAssessments, setPendingAssessments] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchPendingAssessments(parsedUser.id);
    }
  }, [router]);

  async function fetchPendingAssessments(userId: string) {
    try {
      const { data, error } = await supabase
        .from('assessment_assignments')
        .select('id')
        .eq('assigned_to', userId)
        .eq('status', 'pending');

      if (error) throw error;
      setPendingAssessments(data?.length || 0);
    } catch (err) {
      console.error('Error fetching pending assessments:', err);
    }
  }

  function handleLogout() {
    localStorage.removeItem('user');
    router.push('/login');
  }

  function getFirstName() {
    if (!user?.name) return 'Employee';
    // Handle "Lastname, Firstname" format
    if (user.name.includes(',')) {
      return user.name.split(',')[1]?.trim() || user.name;
    }
    // Handle "Firstname Lastname" format
    return user.name.split(' ')[0];
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
        <h1 className="text-3xl font-bold mb-1" style={{ color: '#f89939' }}>
          Welcome, {getFirstName()}
        </h1>
        <p className="text-gray-600 mb-8">Employee Dashboard</p>

        {/* Pending Assessments Notification */}
        {pendingAssessments > 0 && (
          <div 
            className="mb-8 p-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg cursor-pointer hover:bg-yellow-100 transition"
            onClick={() => router.push('/dashboard/employee/my-assessments')}
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-yellow-900 mb-1">📋 Pending Assessment{pendingAssessments !== 1 ? 's' : ''}</h2>
                <p className="text-yellow-800">
                  You have <span className="font-semibold">{pendingAssessments}</span> assessment{pendingAssessments !== 1 ? 's' : ''} waiting for completion.
                </p>
              </div>
              <span className="text-3xl font-bold text-yellow-600">{pendingAssessments}</span>
            </div>
            <p className="text-sm text-yellow-700 mt-3">Click here to view and complete your assessments →</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Quick Access */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {/* My Assessments */}
              <div 
                className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
                onClick={() => router.push('/dashboard/employee/my-assessments')}
              >
                <h3 className="font-semibold text-gray-800 mb-1">My Assessments</h3>
                <p className="text-sm text-gray-600">View and sign</p>
                {pendingAssessments > 0 && (
                  <div className="mt-2 inline-block bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded">
                    {pendingAssessments} pending
                  </div>
                )}
                <p className="text-xs text-orange-500 mt-2">→</p>
              </div>

              {/* My Reports */}
              <div 
                className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
                onClick={() => router.push('/dashboard/employee/my-reports')}
              >
                <h3 className="font-semibold text-gray-800 mb-1">My Reports</h3>
                <p className="text-sm text-gray-600">View submitted</p>
                <p className="text-xs text-orange-500 mt-2">→</p>
              </div>
            </div>
          </div>

          {/* Right Content - Report Buttons */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#f89939' }}>Submit a Report</h2>
              <p className="text-gray-600 mb-6">Choose a report type to submit</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Report Hazard */}
                <div 
                  className="border-2 border-gray-200 p-6 rounded-lg hover:border-orange-400 hover:shadow-lg transition cursor-pointer text-center"
                  onClick={() => router.push('/dashboard/employee/report-hazard')}
                >
                  <div className="text-4xl mb-3">⚠️</div>
                  <h3 className="font-semibold text-gray-800 mb-2">Report Hazard</h3>
                  <p className="text-sm text-gray-600">Identify a potential danger</p>
                  <p className="text-sm text-orange-500 font-semibold mt-4">→ Report</p>
                </div>

                {/* Report Incident */}
                <div 
                  className="border-2 border-gray-200 p-6 rounded-lg hover:border-orange-400 hover:shadow-lg transition cursor-pointer text-center"
                  onClick={() => router.push('/dashboard/employee/report-incident')}
                >
                  <div className="text-4xl mb-3">🚨</div>
                  <h3 className="font-semibold text-gray-800 mb-2">Report Incident</h3>
                  <p className="text-sm text-gray-600">Report an accident with injury</p>
                  <p className="text-sm text-orange-500 font-semibold mt-4">→ Report</p>
                </div>

                {/* Report Near-Miss */}
                <div 
                  className="border-2 border-gray-200 p-6 rounded-lg hover:border-orange-400 hover:shadow-lg transition cursor-pointer text-center"
                  onClick={() => router.push('/dashboard/employee/report-nearmiss')}
                >
                  <div className="text-4xl mb-3">💡</div>
                  <h3 className="font-semibold text-gray-800 mb-2">Report Near-Miss</h3>
                  <p className="text-sm text-gray-600">Report what could have happened</p>
                  <p className="text-sm text-orange-500 font-semibold mt-4">→ Report</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}