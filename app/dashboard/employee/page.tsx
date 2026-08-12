'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  name: string;
  role: string;
  department: string;
}

interface PendingAssessment {
  id: string;
  assessment_id: string;
  due_date: string;
}

export default function EmployeeDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        fetchPendingAssessments(parsedUser.id);
      } catch (err) {
        console.error('Error parsing user:', err);
        router.push('/login');
      }
    }
  }, [router]);

  async function fetchPendingAssessments(userId: string) {
    try {
      const { data, error } = await supabase
        .from('assessment_assignments')
        .select('*')
        .eq('assigned_to', userId)
        .eq('status', 'pending');

      if (error) throw error;
      setPendingCount(data?.length || 0);
    } catch (err) {
      console.error('Error fetching assessments:', err);
    }
  }

  function handleLogout() {
    localStorage.removeItem('user');
    router.push('/login');
  }

  if (!user) return <div className="p-8 text-center">Loading...</div>;

  const firstName = user.name.split(',')[1]?.trim() || user.name;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Image src="/ldr.logo.png" alt="LDR Logo" width={50} height={50} />
            <h1 className="text-2xl font-bold">LDR HR Portal</h1>
          </div>
          <button
            onClick={handleLogout}
            style={{ backgroundColor: '#f89939' }}
            className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-4 gap-6">
        {/* Sidebar */}
        <aside className="col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-bold text-lg mb-6" style={{ color: '#f89939' }}>
              Welcome, {firstName}
            </h2>

            <nav className="space-y-2">
              
                href="/dashboard/employee/my-assessments"
                className="flex items-center px-4 py-2 text-gray-700 hover:bg-orange-50 rounded relative"
              >
                ✓ My Assessments
                {pendingCount > 0 && (
                  <span
                    style={{ backgroundColor: '#f89939' }}
                    className="ml-auto text-white text-xs font-bold px-2 py-1 rounded-full"
                  >
                    {pendingCount}
                  </span>
                )}
              </a>
              
                href="/dashboard/employee/my-reports"
                className="flex items-center px-4 py-2 text-gray-700 hover:bg-orange-50 rounded"
              >
                📋 My Reports
              </a>
              
                href="/dashboard/employee/documents"
                className="flex items-center px-4 py-2 text-gray-700 hover:bg-orange-50 rounded"
              >
                📄 HR Documents
              </a>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="col-span-3 space-y-6">
          {/* Pending Assessments Banner */}
          {pendingCount > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded">
              <p className="font-semibold text-yellow-800">
                📌 You have {pendingCount} pending assessment{pendingCount > 1 ? 's' : ''} to complete
              </p>
              
                href="/dashboard/employee/my-assessments"
                className="text-yellow-600 hover:text-yellow-800 font-semibold mt-2 inline-block"
              >
                View assessments →
              </a>
            </div>
          )}

          {/* Welcome Card */}
          <div className="bg-white rounded-lg shadow p-8">
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#f89939' }}>
              Welcome, {firstName}!
            </h1>
            <p className="text-gray-600">
              Complete your assessments, submit reports, and stay updated with company documents.
            </p>
          </div>

          {/* Submit a Report Section */}
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#f89939' }}>
              Submit a Report
            </h2>
            <div className="grid grid-cols-3 gap-4">
              
                href="/dashboard/employee/report-hazard"
                style={{ backgroundColor: '#f89939' }}
                className="px-6 py-4 text-white rounded-lg font-semibold hover:opacity-90 text-center"
              >
                ⚠️ Hazard Report
              </a>
              
                href="/dashboard/employee/report-incident"
                style={{ backgroundColor: '#f89939' }}
                className="px-6 py-4 text-white rounded-lg font-semibold hover:opacity-90 text-center"
              >
                🚨 Incident Report
              </a>
              
                href="/dashboard/employee/report-nearmiss"
                style={{ backgroundColor: '#f89939' }}
                className="px-6 py-4 text-white rounded-lg font-semibold hover:opacity-90 text-center"
              >
                ⚡ Near-Miss Report
              </a>
            </div>
          </div>

          {/* My Assessments Quick Link */}
          {pendingCount > 0 && (
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#f89939' }}>
                Pending Assessments
              </h2>
              <p className="text-gray-600 mb-6">
                Please complete your assigned assessments by the due date.
              </p>
              
                href="/dashboard/employee/my-assessments"
                style={{ backgroundColor: '#f89939' }}
                className="px-6 py-3 text-white rounded-lg font-semibold hover:opacity-90 inline-block"
              >
                Complete Assessments →
              </a>
            </div>
          )}

          {/* Quick Info */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <p className="text-blue-900 font-semibold">
              💡 Need help? Check the HR Documents section for policies and guidelines.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}