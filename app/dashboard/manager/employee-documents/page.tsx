'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
}

export default function EmployeeDocumentsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchEmployees();
  }, [router]);

  async function fetchEmployees() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('employees').select('id, name, email, department').order('name', { ascending: true });
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search) return employees;
    const term = search.toLowerCase();
    return employees.filter((e) => e.name.toLowerCase().includes(term) || e.email.toLowerCase().includes(term));
  }, [employees, search]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>Employee Documents</h1>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-gray-600 mb-4">Select an employee to view their WHS documents, training records, and certifications.</p>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full px-4 py-2 border rounded-lg text-black mb-6"
          />

          {loading ? (
            <p className="text-gray-600">Loading employees...</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-600">No employees found.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((emp) => (
                <a
                  key={emp.id}
                  href={`/dashboard/manager/employee-documents/${emp.id}`}
                  className="flex justify-between items-center p-4 border rounded-lg hover:bg-orange-50 transition"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{emp.name}</p>
                    <p className="text-sm text-gray-600">{emp.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2 py-1 rounded bg-gray-100 text-gray-700">{emp.department}</span>
                    <span className="text-gray-400">→</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
