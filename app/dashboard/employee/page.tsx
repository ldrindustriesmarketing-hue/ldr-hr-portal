'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { getEmployeeStats } from '@/lib/stats';

interface User {
  id: string;
  name: string;
  role: string;
  department: string;
}

interface Stats {
  pendingAssessments: number;
  signedAssessments: number;
  myReports: number;
}

export default function EmployeeDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({ pendingAssessments: 0, signedAssessments: 0, myReports: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        fetchStats(parsedUser.id);
      } catch (err) {
        console.error('Error parsing user:', err);
        router.push('/login');
      }
    }
  }, [router]);

  async function fetchStats(userId: string) {
    try {
      setLoadingStats(true);
      const employeeStats = await getEmployeeStats(userId);
      setStats(employeeStats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoadingStats(false);
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
      <header className="bg-black shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Image src="/ldr-logo-white.png" alt="LDR Logo" width={50} height={50} />
            <h1 className="text-2xl font-bold text-white">LDR HR Portal</h1>
          </div>
          <button onClick={handleLogout} style={{ backgroundColor: '#f89939' }} className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90">Logout</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-4 gap-6">
        <aside className="col-span-1">
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div>
              <h2 className="font-bold text-lg mb-2" style={{ color: '#f89939' }}>Welcome, {firstName}</h2>
              <p className="text-sm text-gray-600">{user.department}</p>
            </div>

            <nav className="space-y-2">
              <a href="/dashboard/employee/my-assessments" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">✓ My Assessments {stats.pendingAssessments > 0 && <span style={{ backgroundColor: '#f89939' }} className="text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">{stats.pendingAssessments}</span>}</a>
              <a href="/dashboard/employee/my-reports" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">📋 My Reports</a>
              <a href="/dashboard/employee/documents" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">📄 HR Documents</a>
            </nav>

            <hr />

            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase mb-3">Submit Report</p>
              <nav className="space-y-2">
                <a href="/dashboard/employee/report-hazard" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">⚠️ Hazard</a>
                <a href="/dashboard/employee/report-incident" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">🚨 Incident</a>
                <a href="/dashboard/employee/report-nearmiss" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">⚡ Near-Miss</a>
              </nav>
            </div>
          </div>
        </aside>

        <main className="col-span-3 space-y-6">
          {stats.pendingAssessments > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded">
              <p className="font-semibold text-yellow-800">📌 You have {stats.pendingAssessments} pending assessment{stats.pendingAssessments > 1 ? 's' : ''} to complete</p>
              <a href="/dashboard/employee/my-assessments" className="text-yellow-600 hover:text-yellow-800 font-semibold mt-2 inline-block">Complete now →</a>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-8">
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#f89939' }}>Welcome, {firstName}!</h1>
            <p className="text-gray-600">Complete your assessments, submit reports, and stay updated with company documents.</p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-semibold uppercase">Pending Assessments</p>
              <p className="text-4xl font-bold mt-2" style={{ color: '#f89939' }}>{loadingStats ? '-' : stats.pendingAssessments}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-semibold uppercase">Signed Assessments</p>
              <p className="text-4xl font-bold mt-2" style={{ color: '#f89939' }}>{loadingStats ? '-' : stats.signedAssessments}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-semibold uppercase">My Reports</p>
              <p className="text-4xl font-bold mt-2" style={{ color: '#f89939' }}>{loadingStats ? '-' : stats.myReports}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#f89939' }}>Submit a Report</h2>
            <div className="grid grid-cols-3 gap-4">
              <a href="/dashboard/employee/report-hazard" style={{ backgroundColor: '#f89939' }} className="px-6 py-4 text-white rounded-lg font-semibold hover:opacity-90 text-center text-sm">⚠️ Hazard Report</a>
              <a href="/dashboard/employee/report-incident" style={{ backgroundColor: '#f89939' }} className="px-6 py-4 text-white rounded-lg font-semibold hover:opacity-90 text-center text-sm">🚨 Incident Report</a>
              <a href="/dashboard/employee/report-nearmiss" style={{ backgroundColor: '#f89939' }} className="px-6 py-4 text-white rounded-lg font-semibold hover:opacity-90 text-center text-sm">⚡ Near-Miss Report</a>
            </div>
          </div>

          {stats.pendingAssessments > 0 && (
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#f89939' }}>Pending Assessments</h2>
              <p className="text-gray-600 mb-6">Please complete your assigned assessments by the due date.</p>
              <a href="/dashboard/employee/my-assessments" style={{ backgroundColor: '#f89939' }} className="px-6 py-3 text-white rounded-lg font-semibold hover:opacity-90 inline-block">Complete Assessments →</a>
            </div>
          )}

          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <p className="text-blue-900 font-semibold">💡 Your stats update in real-time. Check back regularly for new assessments and documents.</p>
          </div>
        </main>
      </div>
    </div>
  );
}