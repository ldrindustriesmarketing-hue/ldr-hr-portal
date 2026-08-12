'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ReportHazardPage() {
  const [user, setUser] = useState<any>(null);
  const [hazardName, setHazardName] = useState('');
  const [hazardSite, setHazardSite] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageData(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function removeImage() {
    setImageData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!hazardName || !hazardSite || !location || !description) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      if (!user) {
        router.push('/login');
        return;
      }

      // Insert hazard report
      const { data, error } = await supabase
        .from('hazard_reports')
        .insert([
          {
            submitted_by: user.id,
            hazard_name: hazardName,
            hazard_site: hazardSite,
            location: location,
            description: description,
            severity: severity,
            image_data: imageData,
            status: 'submitted',
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;

      // Send emails to managers
      try {
        const { data: managers } = await supabase
          .from('employees')
          .select('email, name')
          .in('role', ['manager', 'admin']);

        for (const manager of managers || []) {
          await fetch('/api/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'report-submitted',
              managerEmail: manager.email,
              managerName: manager.name,
              employeeName: user?.name || 'Employee',
              reportType: 'Hazard'
            })
          });
        }
      } catch (emailError) {
        console.error('Email send error:', emailError);
      }

      setSuccess(true);

      setTimeout(() => {
        router.push('/dashboard/employee/my-reports');
      }, 2000);
    } catch (err) {
      console.error('Error submitting report:', err);
      alert('Failed to submit hazard report. Please try again.');
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#f89939' }}>
            Hazard Report Submitted
          </h1>
          <p className="text-gray-600 mb-4">
            Your hazard report has been successfully submitted. Management has been notified.
          </p>
          <p className="text-sm text-gray-500">Redirecting to your reports...</p>
        </div>
      </div>
    );
  }

  if (!user) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/dashboard/employee')}
          className="mb-6 text-gray-600 hover:text-gray-800 flex items-center font-semibold"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white p-8 rounded-lg shadow">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#f89939' }}>
            Report a Hazard
          </h1>
          <p className="text-gray-600 mb-8">
            Help us identify and manage workplace hazards
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Hazard Name */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Hazard Name *
              </label>
              <input
                type="text"
                value={hazardName}
                onChange={(e) => setHazardName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-orange-500"
                placeholder="e.g., Loose electrical cable, Wet floor"
                disabled={loading}
              />
            </div>

            {/* Hazard Site */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Site/Area *
              </label>
              <input
                type="text"
                value={hazardSite}
                onChange={(e) => setHazardSite(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-orange-500"
                placeholder="e.g., Manufacturing floor, Office"
                disabled={loading}
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Specific Location *
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-orange-500"
                placeholder="e.g., Near Station 5, Warehouse Shelf 3"
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-orange-500"
                placeholder="Describe the hazard in detail..."
                rows={4}
                disabled={loading}
              />
            </div>

            {/* Severity */}
            <div>
              <label className="block text-gray-700 font-semibold mb-4">
                Severity Level
              </label>
              <div className="flex gap-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="severity"
                    value="low"
                    checked={severity === 'low'}
                    onChange={() => setSeverity('low')}
                    className="mr-2"
                    disabled={loading}
                  />
                  <span className="text-gray-700">🟢 Low</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="severity"
                    value="medium"
                    checked={severity === 'medium'}
                    onChange={() => setSeverity('medium')}
                    className="mr-2"
                    disabled={loading}
                  />
                  <span className="text-gray-700">🟡 Medium</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="severity"
                    value="high"
                    checked={severity === 'high'}
                    onChange={() => setSeverity('high')}
                    className="mr-2"
                    disabled={loading}
                  />
                  <span className="text-gray-700">🔴 High</span>
                </label>
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Upload Photo (Optional)
              </label>
              {imageData ? (
                <div className="relative mb-4">
                  <img
                    src={imageData}
                    alt="Hazard"
                    className="w-full max-h-64 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-red-600"
                    disabled={loading}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-500 transition bg-gray-50">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={loading}
                  />
                  <div className="text-center">
                    <div className="text-3xl mb-2">📷</div>
                    <p className="text-gray-600 font-semibold">Click to upload image</p>
                    <p className="text-sm text-gray-500">or drag and drop</p>
                  </div>
                </label>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: '#f89939' }}
                className="flex-1 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? 'Submitting Report...' : 'Submit Hazard Report'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/employee')}
                className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}