'use client';

import { useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login with:', email);
      
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('id, name, email, role, department')
        .eq('email', email)
        .single();

      console.log('Query result:', { data, fetchError });

      if (fetchError) {
        console.error('Query error:', fetchError);
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      if (!data) {
        console.error('No data returned');
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      console.log('Employee found:', data);

      if (password !== 'password123') {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      localStorage.setItem('user', JSON.stringify({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        department: data.department
      }));

      if (data.role === 'manager' || data.role === 'admin') {
        window.location.href = '/dashboard/manager';
      } else {
        window.location.href = '/dashboard/employee';
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-center mb-8">
            <Image src="/ldr.logo.png" alt="LDR Logo" width={80} height={80} />
          </div>

          <h1 className="text-3xl font-bold text-center mb-2" style={{ color: '#f89939' }}>
            WHS Portal
          </h1>
          <p className="text-gray-600 text-center mb-8">Sign in</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-black"
              placeholder="Email"
              disabled={loading}
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-black"
              placeholder="Password"
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#f89939' }}
              className="w-full text-white py-2 rounded-lg font-semibold"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t text-sm text-gray-600">
            <p><strong>Demo:</strong> robert@ldrindustries.com.au</p>
            <p><strong>Password:</strong> password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}