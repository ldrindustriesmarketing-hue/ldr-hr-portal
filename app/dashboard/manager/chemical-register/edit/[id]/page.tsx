'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';
import { fileToDataUrl, compressImageFile } from '@/lib/image';
import { HAZARD_CLASSIFICATIONS } from '@/lib/chemicalHazards';

export default function EditChemicalPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [productName, setProductName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [hazardClassification, setHazardClassification] = useState('Flammable');
  const [sdsIssueDate, setSdsIssueDate] = useState('');
  const [sdsReviewDate, setSdsReviewDate] = useState('');
  const [notes, setNotes] = useState('');
  const [sdsDocument, setSdsDocument] = useState('');
  const [sdsFileName, setSdsFileName] = useState('');
  const [fileUploading, setFileUploading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    fetchChemical();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchChemical() {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase.from('chemical_register').select('*').eq('id', id).single();
      if (fetchError) throw fetchError;

      setProductName(data.product_name || '');
      setManufacturer(data.manufacturer || '');
      setLocation(data.location || '');
      setQuantity(data.quantity || '');
      setHazardClassification(data.hazard_classification || 'Flammable');
      setSdsIssueDate(data.sds_issue_date || '');
      setSdsReviewDate(data.sds_review_date || '');
      setNotes(data.notes || '');
      setSdsDocument(data.sds_document || '');
      setSdsFileName(data.sds_document ? 'Current SDS on file' : '');
    } catch (err) {
      console.error('Error loading chemical:', err);
      setError('Failed to load chemical');
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setFileUploading(true);
      const dataUrl = file.type.startsWith('image/') ? await compressImageFile(file) : await fileToDataUrl(file);
      setSdsDocument(dataUrl);
      setSdsFileName(file.name);
    } catch (err) {
      console.error('Error processing SDS file:', err);
      setError('Failed to process the SDS file');
    } finally {
      setFileUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!productName.trim()) {
      setError('Please enter a product name');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('chemical_register')
        .update({
          product_name: productName,
          manufacturer: manufacturer || null,
          location: location || null,
          quantity: quantity || null,
          hazard_classification: hazardClassification,
          sds_issue_date: sdsIssueDate || null,
          sds_review_date: sdsReviewDate || null,
          notes: notes || null,
          sds_document: sdsDocument || null,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      await logAudit('chemical_register_updated', userData.id, id, 'chemical_register', { product_name: productName });

      router.push('/dashboard/manager/chemical-register');
    } catch (err) {
      console.error('Error updating chemical:', err);
      setError('Failed to update chemical');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>Edit Chemical</h1>
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
              <label className="block text-gray-700 font-semibold mb-2">Product Name *</label>
              <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" required disabled={saving} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Manufacturer / Supplier</label>
              <input type="text" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" disabled={saving} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Location Stored / Used</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" disabled={saving} />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Approximate Quantity</label>
                <input type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" disabled={saving} />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Hazard Classification *</label>
              <select
                value={hazardClassification}
                onChange={(e) => setHazardClassification(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-black"
                required
                disabled={saving}
              >
                {HAZARD_CLASSIFICATIONS.map((h) => (
                  <option key={h.value} value={h.value}>{h.value}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">SDS Issue Date</label>
                <input type="date" value={sdsIssueDate} onChange={(e) => setSdsIssueDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" disabled={saving} />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">SDS Review Due</label>
                <input type="date" value={sdsReviewDate} onChange={(e) => setSdsReviewDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" disabled={saving} />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" rows={4} disabled={saving} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Safety Data Sheet (SDS)</label>
              <input type="file" accept="application/pdf,image/*" onChange={handleFileChange} className="w-full px-4 py-2 border rounded-lg" disabled={saving || fileUploading} />
              {fileUploading && <p className="text-sm text-gray-500 mt-2">Processing file...</p>}
              {sdsDocument && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-sm text-gray-700">📎 {sdsFileName}</span>
                  <button type="button" onClick={() => { setSdsDocument(''); setSdsFileName(''); }} className="text-red-600 text-sm font-semibold hover:text-red-800" disabled={saving}>Remove</button>
                </div>
              )}
            </div>

            <button type="submit" disabled={saving || fileUploading} style={{ backgroundColor: '#f89939' }} className="w-full text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
