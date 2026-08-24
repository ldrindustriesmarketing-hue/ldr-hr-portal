'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getDashboardStats } from '@/lib/stats';
import { getDaysSinceStatus, getComplianceStatus } from '@/lib/dials';

interface User {
  id: string;
  name: string;
  role: string;
  department: string;
}

interface Stats {
  hazardReports: number;
  incidentReports: number;
  nearmissReports: number;
  pendingAssessments: number;
  signedAssessments: number;
  daysSinceIncident: number | null;
  daysSinceNearMiss: number | null;
  assessmentTotal: number;
  assessmentSigned: number;
  trainingTotal: number;
  trainingSigned: number;
  pendingCertReviews: number;
}

function DaysSinceTile({ label, days }: { label: string; days: number | null }) {
  const status = getDaysSinceStatus(days);
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-600 text-sm font-semibold uppercase">{label}</p>
      <p className="text-4xl font-bold mt-2" style={{ color: status.color }}>{days === null ? '—' : days}</p>
      <span className={`text-xs font-bold px-2 py-1 rounded mt-2 inline-block ${status.badgeBg} ${status.badgeText}`}>{status.icon} {status.label}</span>
    </div>
  );
}

function ComplianceMeter({ label, signed, total }: { label: string; signed: number; total: number }) {
  const pct = total > 0 ? Math.round((signed / total) * 100) : 0;
  const status = getComplianceStatus(total > 0 ? pct : 100);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="bg-white rounded-lg shadow p-6 flex items-center gap-6">
      <div className="relative w-28 h-28 flex-shrink-0">
        <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
          <circle cx="56" cy="56" r={radius} fill="none" stroke={status.color} strokeOpacity={0.15} strokeWidth={10} />
          <circle
            cx="56" cy="56" r={radius} fill="none"
            stroke={status.color} strokeWidth={10} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">{total > 0 ? `${pct}%` : '—'}</span>
        </div>
      </div>
      <div>
        <p className="text-gray-600 text-sm font-semibold uppercase">{label}</p>
        <p className="text-xs text-gray-500 mt-1">{total > 0 ? `${signed} of ${total} signed` : 'No records yet'}</p>
        <span className={`text-xs font-bold px-2 py-1 rounded mt-2 inline-block ${status.badgeBg} ${status.badgeText}`}>{status.icon} {status.label}</span>
      </div>
    </div>
  );
}

export default function ManagerDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({
    hazardReports: 0,
    incidentReports: 0,
    nearmissReports: 0,
    pendingAssessments: 0,
    signedAssessments: 0,
    daysSinceIncident: null,
    daysSinceNearMiss: null,
    assessmentTotal: 0,
    assessmentSigned: 0,
    trainingTotal: 0,
    trainingSigned: 0,
    pendingCertReviews: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      try {
        setUser(JSON.parse(userData));
        fetchStats();
      } catch (err) {
        console.error('Error parsing user:', err);
        router.push('/login');
      }
    }
  }, [router]);

  async function fetchStats() {
    try {
      setLoadingStats(true);
      const dashboardStats = await getDashboardStats();
      setStats(dashboardStats);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-black shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Image src="/ldr-logo-white.png" alt="LDR Logo" width={50} height={50} />
            <h1 className="text-2xl font-bold text-white">WHS Portal</h1>
          </div>
          <button onClick={handleLogout} style={{ backgroundColor: '#f89939' }} className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90">Logout</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-4 gap-6">
        <aside className="col-span-1">
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div>
              <h2 className="font-bold text-lg mb-2" style={{ color: '#f89939' }}>Welcome</h2>
              <p className="text-sm text-gray-600">{user.name.split(',')[1]?.trim() || user.name}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase mb-3">View Reports</p>
              <nav className="space-y-2">
                <a href="/dashboard/manager/all-reports" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">📋 Hazard Reports</a>
                <a href="/dashboard/manager/all-incidents" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">🚨 Incident Reports</a>
                <a href="/dashboard/manager/all-nearmiss" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">⚡ Near-Miss Reports</a>
              </nav>
            </div>

            <hr />

            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase mb-3">Submit Reports</p>
              <nav className="space-y-2">
                <a href="/dashboard/manager/report-hazard" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">⚠️ Report Hazard</a>
                <a href="/dashboard/manager/report-incident" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">🚨 Report Incident</a>
                <a href="/dashboard/manager/report-nearmiss" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">⚡ Report Near-Miss</a>
              </nav>
            </div>

            <hr />

            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase mb-3">Assessments</p>
              <nav className="space-y-2">
                <a href="/dashboard/manager/assessments" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">📋 All Assessments</a>
                <a href="/dashboard/manager/pending-assessments" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">⏳ Pending Assessments</a>
                <a href="/dashboard/manager/create-risk-assessment" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">➕ Create Risk Assessment</a>
                <a href="/dashboard/manager/create-chemical-assessment" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">➕ Create Chemical Assessment</a>
                <a href="/dashboard/manager/assign-assessments" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">✓ Assign Assessments</a>
              </nav>
            </div>

            <hr />

            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase mb-3">Management</p>
              <nav className="space-y-2">
                <a href="/dashboard/manager/employee-documents" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">🗂️ Employee Documents</a>
                <a href="/dashboard/manager/pending-certifications" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">📥 Certification Reviews {stats.pendingCertReviews > 0 && <span style={{ backgroundColor: '#f89939' }} className="text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">{stats.pendingCertReviews}</span>}</a>
                <a href="/dashboard/manager/documents" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">📄 WHS Documents</a>
                <a href="/dashboard/manager/chemical-register" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">🧪 Chemical Register</a>
                <a href="/dashboard/manager/audit-trail" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 rounded text-sm">📊 Audit Trail</a>
              </nav>
            </div>
          </div>
        </aside>

        <main className="col-span-3 space-y-6">
          <div className="bg-white rounded-lg shadow p-8">
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#f89939' }}>Welcome back!</h1>
            <p className="text-gray-600">Manage your team's assessments, view reports, and maintain compliance.</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <a href="/dashboard/manager/all-reports" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <p className="text-gray-600 text-sm font-semibold uppercase">Hazard Reports</p>
              <p className="text-4xl font-bold mt-2" style={{ color: '#f89939' }}>{loadingStats ? '-' : stats.hazardReports}</p>
              <p className="text-xs text-gray-500 mt-2">Submitted status</p>
            </a>
            <a href="/dashboard/manager/all-incidents" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <p className="text-gray-600 text-sm font-semibold uppercase">Incident Reports</p>
              <p className="text-4xl font-bold mt-2" style={{ color: '#f89939' }}>{loadingStats ? '-' : stats.incidentReports}</p>
              <p className="text-xs text-gray-500 mt-2">Submitted status</p>
            </a>
            <a href="/dashboard/manager/all-nearmiss" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <p className="text-gray-600 text-sm font-semibold uppercase">Near-Miss Reports</p>
              <p className="text-4xl font-bold mt-2" style={{ color: '#f89939' }}>{loadingStats ? '-' : stats.nearmissReports}</p>
              <p className="text-xs text-gray-500 mt-2">Submitted status</p>
            </a>
            <a href="/dashboard/manager/pending-assessments" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <p className="text-gray-600 text-sm font-semibold uppercase">Pending Assessments</p>
              <p className="text-4xl font-bold mt-2" style={{ color: '#f89939' }}>{loadingStats ? '-' : stats.pendingAssessments}</p>
              <p className="text-xs text-gray-500 mt-2">Awaiting completion</p>
            </a>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#f89939' }}>Safety & Compliance</h2>
            <div className="grid grid-cols-2 gap-6">
              {loadingStats ? (
                <>
                  <div className="bg-white rounded-lg shadow p-6 text-gray-400">Loading...</div>
                  <div className="bg-white rounded-lg shadow p-6 text-gray-400">Loading...</div>
                  <div className="bg-white rounded-lg shadow p-6 text-gray-400">Loading...</div>
                  <div className="bg-white rounded-lg shadow p-6 text-gray-400">Loading...</div>
                </>
              ) : (
                <>
                  <DaysSinceTile label="Days Since Last Incident" days={stats.daysSinceIncident} />
                  <DaysSinceTile label="Days Since Last Near-Miss" days={stats.daysSinceNearMiss} />
                  <ComplianceMeter label="Assessment Sign-off" signed={stats.assessmentSigned} total={stats.assessmentTotal} />
                  <ComplianceMeter label="Training Compliance" signed={stats.trainingSigned} total={stats.trainingTotal} />
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}