'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

export default function ReportHazardPage() {
  const [hazardName, setHazardName] = useState('');
  const [hazardSite, setHazardSite] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
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
        .from('hazard_reports')
        .insert({
          submitted_by: userData.id,
          hazard_name: hazardName,
          hazard_site: hazardSite,
          location: location,
          description: description,
          severity: severity,
          status: 'submitted',
          image_data: image
        })
        .select();

      if (insertError) throw insertError;

      await logAudit(
        'report_submitted',
        userData.id,
        data[0].id,
        'hazard_report',
        { hazard_name: hazardName, location: location, severity: severity }
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
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>Report Hazard</h1>
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
              <label className="block text-gray-700 font-semibold mb-2">Hazard Name *</label>
              <input type="text" value={hazardName} onChange={(e) => setHazardName(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="e.g., Slippery floor" required disabled={loading} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Hazard Site *</label>
              <input type="text" value={hazardSite} onChange={(e) => setHazardSite(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="e.g., Warehouse" required disabled={loading} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Location *</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="e.g., Aisle 3" required disabled={loading} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Description *</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="Describe the hazard in detail" rows={4} required disabled={loading} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Severity *</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" required disabled={loading}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Photo (Optional)</label>
              <input type="file" accept="image/*" onChange={handleImageChange} className="w-full px-4 py-2 border rounded-lg" disabled={loading} />
              {image && <img src={image} alt="Preview" className="mt-4 max-w-sm rounded-lg" />}
            </div>

            <button type="submit" disabled={loading} style={{ backgroundColor: '#f89939' }} className="w-full text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit Hazard Report'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}