'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ReportNearMissPage() {
  const [user, setUser] = useState<any>(null);
  const [location, setLocation] = useState('');
  const [injuries, setInjuries] = useState('no');
  const [whatCouldHappen, setWhatCouldHappen] = useState('');
  const [contributingFactors, setContributingFactors] = useState('');
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

  // Auto-redirect if injuries reported
  useEffect(() => {
    if (injuries === 'yes') {
      router.push('/dashboard/employee/report-incident');
    }
  }, [injuries, router]);

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

    if (injuries === 'yes') {
      alert('If there were injuries, please report this as an Incident instead.');
      router.push('/dashboard/employee/report-incident');
      return;
    }

    if (!location || !whatCouldHappen || !contributingFactors) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      if (!user) {
        router.push('/login');
        return;
      }

      // Insert near-miss report
      const { error } = await supabase
        .from('near_miss_reports')
        .insert([
          {
            submitted_by: user.id,
            location: location,
            what_could_have_happened: whatCouldHappen,
            contributing_factors: contributingFactors,
            image_data: imageData,
            status: 'submitted',
            created_at: new Date().toISOString()
          }
        ]);

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
              reportType: 'Near-Miss'
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
      alert('Failed to submit near-miss report. Please try again.');
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#f89939' }}>
            Near-Miss Report Submitted
          </h1>
          <p className="text-gray-600 mb-4">
            Your near-miss report has been successfully submitted. Management has been notified.
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
            Report a Near-Miss
          </h1>
          <p className="text-gray-600 mb-8">
            Report situations where an incident could have occurred but didn't
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Injuries Check - Green Highlight */}
            <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
              <p className="text-green-900 font-semibold mb-3">💡 Was anyone injured in this situation?</p>
              <div className="flex gap-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="injuries"
                    value="no"
                    checked={injuries === 'no'}
                    onChange={() => setInjuries('no')}
                    className="mr-2"
                    disabled={loading}
                  />
                  <span className="text-green-900 font-semibold">No (Near-Miss)</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="injuries"
                    value="yes"
                    checked={injuries === 'yes'}
                    onChange={() => setInjuries('yes')}
                    className="mr-2"
                    disabled={loading}
                  />
                  <span className="text-green-900 font-semibold">Yes (Report as Incident)</span>
                </label>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Location *
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-orange-500"
                placeholder="Where did the near-miss occur?"
                disabled={loading}
              />
            </div>

            {/* What Could Have Happened */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                What Could Have Happened? *
              </label>
              <textarea
                value={whatCouldHappen}
                onChange={(e) => setWhatCouldHappen(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-orange-500"
                placeholder="Describe what could have happened if conditions were different..."
                rows={4}
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-2">
                Example: "The forklift almost hit a pedestrian, but the pedestrian moved out of the way in time."
              </p>
            </div>

            {/* Contributing Factors */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Contributing Factors *
              </label>
              <textarea
                value={contributingFactors}
                onChange={(e) => setContributingFactors(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-orange-500"
                placeholder="What factors contributed to this near-miss? What could we improve?"
                rows={4}
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-2">
                Example: "Lack of visibility, no warning signs, pedestrian not wearing high-visibility vest"
              </p>
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
                    alt="Near-Miss"
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

            {/* Info Box */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>What is a Near-Miss?</strong> A near-miss is an unplanned event that could have resulted in injury, illness, or property damage but did not. Reporting near-misses helps us prevent future incidents.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: '#f89939' }}
                className="flex-1 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? 'Submitting Report...' : 'Submit Near-Miss Report'}
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