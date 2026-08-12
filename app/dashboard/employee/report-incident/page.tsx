'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ReportIncidentPage() {
  const [user, setUser] = useState<any>(null);
  const [incidentDate, setIncidentDate] = useState('');
  const [location, setLocation] = useState('');
  const [whatHappened, setWhatHappened] = useState('');
  const [injuries, setInjuries] = useState('yes');
  const [injuryDetails, setInjuryDetails] = useState('');
  const [firstAidGiven, setFirstAidGiven] = useState('no');
  const [otherPersonsInvolved, setOtherPersonsInvolved] = useState('');
  const [witnesses, setWitnesses] = useState('');
  const [siteMadeSafe, setSiteMadeSafe] = useState('no');
  const [safetyNotes, setSafetyNotes] = useState('');
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
      // Set today's date as default
      const today = new Date().toISOString().split('T')[0];
      setIncidentDate(today);
    }

    // Redirect if no injuries
    if (injuries === 'no') {
      router.push('/dashboard/employee/report-nearmiss');
    }
  }, [router, injuries]);

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

    if (injuries === 'no') {
      alert('If there were no injuries, please report this as a Near-Miss instead.');
      router.push('/dashboard/employee/report-nearmiss');
      return;
    }

    if (!incidentDate || !location || !whatHappened || !injuryDetails) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      if (!user) {
        router.push('/login');
        return;
      }

      // Insert incident report
      const { error } = await supabase
        .from('incident_reports')
        .insert([
          {
            submitted_by: user.id,
            incident_date: incidentDate,
            location: location,
            what_happened: whatHappened,
            injuries: injuries === 'yes',
            injuries_description: injuryDetails,
            first_aid_given: firstAidGiven === 'yes',
            other_persons_involved: otherPersonsInvolved,
            witnesses: witnesses,
            site_made_safe: siteMadeSafe === 'yes',
            safety_notes: safetyNotes,
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
              reportType: 'Incident'
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
      alert('Failed to submit incident report. Please try again.');
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#f89939' }}>
            Incident Report Submitted
          </h1>
          <p className="text-gray-600 mb-4">
            Your incident report has been successfully submitted. Management has been notified.
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
            Report an Incident
          </h1>
          <p className="text-gray-600 mb-8">
            Report workplace accidents involving injuries
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Injuries Check - Red Highlight */}
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
              <p className="text-red-900 font-semibold mb-3">⚠️ Does this incident involve injuries?</p>
              <div className="flex gap-6">
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
                  <span className="text-red-900 font-semibold">Yes (Injuries)</span>
                </label>
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
                  <span className="text-red-900 font-semibold">No (Report as Near-Miss)</span>
                </label>
              </div>
            </div>

            {/* Incident Date */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Date of Incident *
              </label>
              <input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-orange-500"
                disabled={loading}
              />
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
                placeholder="Where did the incident occur?"
                disabled={loading}
              />
            </div>

            {/* What Happened */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                What Happened? *
              </label>
              <textarea
                value={whatHappened}
                onChange={(e) => setWhatHappened(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-orange-500"
                placeholder="Describe the incident in detail..."
                rows={4}
                disabled={loading}
              />
            </div>

            {/* Injury Details */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Injury Details *
              </label>
              <textarea
                value={injuryDetails}
                onChange={(e) => setInjuryDetails(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-orange-500"
                placeholder="Describe the injuries sustained..."
                rows={3}
                disabled={loading}
              />
            </div>

            {/* First Aid */}
            <div>
              <label className="block text-gray-700 font-semibold mb-3">
                Was first aid given?
              </label>
              <div className="flex gap-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="firstAid"
                    value="yes"
                    checked={firstAidGiven === 'yes'}
                    onChange={() => setFirstAidGiven('yes')}
                    className="mr-2"
                    disabled={loading}
                  />
                  <span className="text-gray-700">Yes</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="firstAid"
                    value="no"
                    checked={firstAidGiven === 'no'}
                    onChange={() => setFirstAidGiven('no')}
                    className="mr-2"
                    disabled={loading}
                  />
                  <span className="text-gray-700">No</span>
                </label>
              </div>
            </div>

            {/* Other Persons Involved */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Other Persons Involved
              </label>
              <textarea
                value={otherPersonsInvolved}
                onChange={(e) => setOtherPersonsInvolved(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-orange-500"
                placeholder="Names and details of other people involved..."
                rows={3}
                disabled={loading}
              />
            </div>

            {/* Witnesses */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Witnesses
              </label>
              <textarea
                value={witnesses}
                onChange={(e) => setWitnesses(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-orange-500"
                placeholder="Names of people who witnessed the incident..."
                rows={3}
                disabled={loading}
              />
            </div>

            {/* Site Made Safe */}
            <div>
              <label className="block text-gray-700 font-semibold mb-3">
                Has the site been made safe?
              </label>
              <div className="flex gap-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="siteSafe"
                    value="yes"
                    checked={siteMadeSafe === 'yes'}
                    onChange={() => setSiteMadeSafe('yes')}
                    className="mr-2"
                    disabled={loading}
                  />
                  <span className="text-gray-700">Yes</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="siteSafe"
                    value="no"
                    checked={siteMadeSafe === 'no'}
                    onChange={() => setSiteMadeSafe('no')}
                    className="mr-2"
                    disabled={loading}
                  />
                  <span className="text-gray-700">No</span>
                </label>
              </div>
            </div>

            {/* Safety Notes */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Safety Notes
              </label>
              <textarea
                value={safetyNotes}
                onChange={(e) => setSafetyNotes(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-orange-500"
                placeholder="Any additional safety information or recommendations..."
                rows={3}
                disabled={loading}
              />
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
                    alt="Incident"
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
                {loading ? 'Submitting Report...' : 'Submit Incident Report'}
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