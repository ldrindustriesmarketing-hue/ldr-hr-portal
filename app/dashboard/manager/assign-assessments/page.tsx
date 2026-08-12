'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Assessment {
  id: string;
  title: string;
  description: string;
}

export default function AssignAssessmentsPage() {
  const [user, setUser] = useState<any>(null);
  const [assessmentType, setAssessmentType] = useState<'risk' | 'chemical'>('risk');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchData();
    }
  }, [router]);

  async function fetchData() {
    try {
      // Fetch employees (only non-managers)
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, name, email, role')
        .eq('role', 'employee');

      if (empError) throw empError;
      setEmployees(empData || []);

      // Fetch risk assessments initially
      await fetchAssessments('risk');
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoadingData(false);
    }
  }

  async function fetchAssessments(type: 'risk' | 'chemical') {
    try {
      const table = type === 'risk' ? 'risk_assessments' : 'chemical_assessments';
      const { data, error } = await supabase
        .from(table)
        .select('id, title, description')
        .eq('status', 'active');

      if (error) throw error;
      setAssessments(data || []);
      setSelectedAssessment('');
    } catch (err) {
      console.error('Error fetching assessments:', err);
    }
  }

  function handleAssessmentTypeChange(type: 'risk' | 'chemical') {
    setAssessmentType(type);
    fetchAssessments(type);
  }

  function toggleEmployee(employeeId: string) {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedAssessment) {
      alert('Please select an assessment');
      return;
    }

    if (selectedEmployees.length === 0) {
      alert('Please select at least one employee');
      return;
    }

    setLoading(true);

    try {
      const assignmentsToCreate = selectedEmployees.map(employeeId => ({
        assessment_id: selectedAssessment,
        assessment_type: assessmentType,
        assigned_to: employeeId,
        due_date: dueDate || null,
        status: 'pending',
        sent_date: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('assessment_assignments')
        .insert(assignmentsToCreate);

      if (error) throw error;

      // Send emails to each employee
      for (const employeeId of selectedEmployees) {
        const employee = employees.find(e => e.id === employeeId);
        const assessment = assessments.find(a => a.id === selectedAssessment);
        
        if (employee && assessment) {
          try {
            await fetch('/api/emails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'assessment-assigned',
                employeeEmail: employee.email,
                employeeName: employee.name,
                assessmentTitle: assessment.title,
                dueDate: dueDate || null
              })
            });
          } catch (emailError) {
            console.error('Email send error:', emailError);
          }
        }
      }

      setSuccess(true);

      setTimeout(() => {
        router.push('/dashboard/manager');
      }, 2000);
    } catch (err) {
      console.error('Error assigning assessments:', err);
      alert('Failed to assign assessments. Please try again.');
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#f89939' }}>
            Assessments Assigned
          </h1>
          <p className="text-gray-600 mb-4">
            Assessments have been assigned to {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''}.
            Notification emails have been sent.
          </p>
          <p className="text-sm text-gray-500">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (!user || loadingData) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-6 text-gray-600 hover:text-gray-800 flex items-center font-semibold"
        >
          ← Back
        </button>

        <div className="bg-white p-8 rounded-lg shadow">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#f89939' }}>
            Assign Assessments
          </h1>
          <p className="text-gray-600 mb-8">
            Select an assessment and assign it to employees
          </p>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Assessment Type Selection */}
            <div>
              <label className="block text-gray-700 font-semibold mb-4">
                Assessment Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="assessmentType"
                    value="risk"
                    checked={assessmentType === 'risk'}
                    onChange={() => handleAssessmentTypeChange('risk')}
                    className="mr-2"
                    disabled={loading}
                  />
                  <span className="text-gray-700">📋 Risk Assessment</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="assessmentType"
                    value="chemical"
                    checked={assessmentType === 'chemical'}
                    onChange={() => handleAssessmentTypeChange('chemical')}
                    className="mr-2"
                    disabled={loading}
                  />
                  <span className="text-gray-700">🧪 Chemical Assessment</span>
                </label>
              </div>
            </div>

            {/* Assessment Selection */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Select Assessment
              </label>
              <select
                value={selectedAssessment}
                onChange={(e) => setSelectedAssessment(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-orange-500"
                disabled={loading}
              >
                <option value="">Choose an assessment...</option>
                {assessments.map(assessment => (
                  <option key={assessment.id} value={assessment.id}>
                    {assessment.title}
                  </option>
                ))}
              </select>
              {selectedAssessment && assessments.find(a => a.id === selectedAssessment) && (
                <p className="text-sm text-gray-600 mt-2">
                  {assessments.find(a => a.id === selectedAssessment)?.description}
                </p>
              )}
            </div>

            {/* Employee Selection */}
            <div>
              <label className="block text-gray-700 font-semibold mb-4">
                Select Employees ({selectedEmployees.length} selected)
              </label>
              <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-4 bg-gray-50">
                {employees.length === 0 ? (
                  <p className="text-gray-600">No employees found</p>
                ) : (
                  employees.map(employee => (
                    <label
                      key={employee.id}
                      className="flex items-center cursor-pointer p-3 hover:bg-gray-100 rounded-lg transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(employee.id)}
                        onChange={() => toggleEmployee(employee.id)}
                        className="mr-3"
                        disabled={loading}
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{employee.name}</p>
                        <p className="text-sm text-gray-600">{employee.email}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Due Date (Optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-orange-500"
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: '#f89939' }}
                className="flex-1 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? 'Assigning & Sending Emails...' : 'Assign Assessments'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Info Box */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Emails will be sent to all selected employees notifying them of their new assessment assignment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}