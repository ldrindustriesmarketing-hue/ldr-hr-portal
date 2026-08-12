'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if already logged in
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.role === 'manager' || user.role === 'admin') {
        router.push('/dashboard/manager');
      } else {
        router.push('/dashboard/employee');
      }
    } else {
      setPageLoading(false);
    }
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        setError('Please enter email and password');
        setLoading(false);
        return;
      }

      // Fetch user by email
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('id, name, email, role, department')
        .eq('email', email)
        .single();

      if (fetchError || !data) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      // Check password (hardcoded for now - in production use proper auth)
      if (password !== 'password123') {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      // Store user in localStorage
      localStorage.setItem('user', JSON.stringify({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        department: data.department
      }));

      // Redirect based on role
      if (data.role === 'manager' || data.role === 'admin') {
        router.push('/dashboard/manager');
      } else {
        router.push('/dashboard/employee');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  }

  if (pageLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image 
              src="/ldr.logo.png" 
              alt="LDR Logo" 
              width={80} 
              height={80}
            />
          </div>

          {/* Header */}
          <h1 className="text-3xl font-bold text-center mb-2" style={{ color: '#f89939' }}>
            LDR HR Portal
          </h1>
          <p className="text-gray-600 text-center mb-8">Sign in to your account</p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-semibold">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#f89939' }}
              className="w-full text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Info */}
          <div className="mt-8 pt-8 border-t">
            <p className="text-gray-600 text-sm font-semibold mb-3">Demo Accounts:</p>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Manager:</strong> robert@ldrindustries.com.au</p>
              <p><strong>Employee:</strong> design@ldrindustries.com.au</p>
              <p><strong>Password:</strong> password123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}