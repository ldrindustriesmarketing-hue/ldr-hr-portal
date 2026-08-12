'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

export default function ReportIncidentPage() {
  const [incidentDate, setIncidentDate] = useState('');
  const [location, setLocation] = useState('');
  const [whatHappened, setWhatHappened] = useState('');
  const [injuries, setInjuries] = useState(false);
  const [injuriesDescription, setInjuriesDescription] = useState('');
  const [firstAidGiven, setFirstAidGiven] = useState(false);
  const [otherPersons, setOtherPersons] = useState('');
  const [witnesses, setWitnesses] = useState('');
  const [siteMadeSafe, setSiteMadeSafe] = useState(false);
  const [safetyNotes, setSafetyNotes] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    }
  }, [router]);

  if (injuries === false && injuriesDescription) {
    setInjuriesDescription('');
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      const { data, error: insertError } = await supabase
        .from('incident_reports')
        .insert({
          submitted_by: userData.id,
          incident_date: incidentDate,
          location: location,
          what_happened: whatHappened,
          injuries: injuries,
          injuries_description: injuries ? injuriesDescription : null,
          first_aid_given: firstAidGiven,
          other_persons_involved: otherPersons,
          witnesses: witnesses,
          site_made_safe: siteMadeSafe,
          safety_notes: safetyNotes,
          status: 'submitted',
          image_data: image
        })
        .select();

      if (insertError) throw insertError;

      await logAudit(
        'report_submitted',
        userData.id,
        data[0].id,
        'incident_report',
        { location: location, injuries: injuries, date: incidentDate }
      );

      router.push('/dashboard/employee/my-reports');
    } catch (err) {
      console.error('Error submitting report:', err);
      setError('Failed to submit report');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>Report Incident</h1>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <label className="flex items-center font-semibold text-red-900">
                <input type="checkbox" checked={injuries} onChange={(e) => setInjuries(e.target.checked)} disabled={loading} className="mr-3 w-4 h-4" />
                Were there any injuries? *
              </label>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Incident Date *</label>
              <input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" required disabled={loading} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Location *</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="Where did it happen?" required disabled={loading} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">What Happened? *</label>
              <textarea value={whatHappened} onChange={(e) => setWhatHappened(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="Describe the incident" rows={4} required disabled={loading} />
            </div>

            {injuries && (
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Injuries Description</label>
                <textarea value={injuriesDescription} onChange={(e) => setInjuriesDescription(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="Describe the injuries" rows={3} disabled={loading} />
              </div>
            )}

            <div>
              <label className="flex items-center font-semibold text-gray-700">
                <input type="checkbox" checked={firstAidGiven} onChange={(e) => setFirstAidGiven(e.target.checked)} disabled={loading} className="mr-3 w-4 h-4" />
                First Aid Given
              </label>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Other Persons Involved</label>
              <input type="text" value={otherPersons} onChange={(e) => setOtherPersons(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="Names or descriptions" disabled={loading} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Witnesses</label>
              <input type="text" value={witnesses} onChange={(e) => setWitnesses(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="Names or descriptions" disabled={loading} />
            </div>

            <div>
              <label className="flex items-center font-semibold text-gray-700">
                <input type="checkbox" checked={siteMadeSafe} onChange={(e) => setSiteMadeSafe(e.target.checked)} disabled={loading} className="mr-3 w-4 h-4" />
                Site Made Safe
              </label>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Safety Notes</label>
              <textarea value={safetyNotes} onChange={(e) => setSafetyNotes(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="Additional safety information" rows={3} disabled={loading} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Photo (Optional)</label>
              <input type="file" accept="image/*" onChange={handleImageChange} className="w-full px-4 py-2 border rounded-lg" disabled={loading} />
              {image && <img src={image} alt="Preview" className="mt-4 max-w-sm rounded-lg" />}
            </div>

            <button type="submit" disabled={loading} style={{ backgroundColor: '#f89939' }} className="w-full text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit Incident Report'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}