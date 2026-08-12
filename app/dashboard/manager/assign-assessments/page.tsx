'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

interface Assessment {
  id: string;
  title: string;
  created_by: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

export default function AssignAssessmentsPage() {
  const [assessmentType, setAssessmentType] = useState<'risk' | 'chemical'>('risk');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router, assessmentType]);

  async function fetchData() {
    try {
      setLoadingData(true);
      const table = assessmentType === 'risk' ? 'risk_assessments' : 'chemical_assessments';

      const { data: assessData } = await supabase.from(table).select('id, title, created_by').eq('status', 'active');
      setAssessments(assessData || []);

      const { data: empData } = await supabase.from('employees').select('id, name, email');
      setEmployees(empData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoadingData(false);
    }
  }

  function toggleEmployee(empId: string) {
    setSelectedEmployees((prev) => (prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!selectedAssessment || selectedEmployees.length === 0 || !dueDate) {
      setError('Please select an assessment, employees, and due date');
      return;
    }

    setLoading(true);

    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      for (const empId of selectedEmployees) {
        const { data, error: insertError } = await supabase
          .from('assessment_assignments')
          .insert({
            assessment_id: selectedAssessment,
            assessment_type: assessmentType,
            assigned_to: empId,
            due_date: dueDate,
            status: 'pending'
          })
          .select();

        if (insertError) throw insertError;

        await logAudit(
          'assessment_assigned',
          userData.id,
          data[0].id,
          'assessment_assignment',
          { assessment_type: assessmentType, employee_count: selectedEmployees.length, due_date: dueDate }
        );
      }

      router.push('/dashboard/manager');
    } catch (err) {
      console.error('Error assigning assessment:', err);
      setError('Failed to assign assessment');
    } finally {
      setLoading(false);
    }
  }

  if (loadingData) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>Assign Assessments</h1>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Assessment Type *</label>
              <select value={assessmentType} onChange={(e) => setAssessmentType(e.target.value as any)} className="w-full px-4 py-2 border rounded-lg text-black" disabled={loading}>
                <option value="risk">Risk Assessment</option>
                <option value="chemical">Chemical Assessment</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Select Assessment *</label>
              <select value={selectedAssessment} onChange={(e) => setSelectedAssessment(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" required disabled={loading}>
                <option value="">-- Choose Assessment --</option>
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Due Date *</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" required disabled={loading} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-3">Select Employees ({selectedEmployees.length}) *</label>
              <div className="space-y-2 max-h-96 overflow-y-auto p-3 border rounded-lg bg-gray-50">
                {employees.map((emp) => (
                  <label key={emp.id} className="flex items-center cursor-pointer">
                    <input type="checkbox" checked={selectedEmployees.includes(emp.id)} onChange={() => toggleEmployee(emp.id)} className="mr-3 w-4 h-4" disabled={loading} />
                    <span className="text-gray-700">{emp.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading || selectedEmployees.length === 0} style={{ backgroundColor: '#f89939' }} className="w-full text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50">
              {loading ? 'Assigning...' : 'Assign Assessment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}