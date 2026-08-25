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
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError || !authData.session) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('id, name, email, role, department')
        .eq('auth_user_id', authData.user.id)
        .single();

      if (fetchError || !data) {
        console.error('No employee profile linked to this account:', fetchError);
        setError('Your account is not linked to an employee profile. Contact your administrator.');
        await supabase.auth.signOut();
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
        </div>
      </div>
    </div>
  );
}