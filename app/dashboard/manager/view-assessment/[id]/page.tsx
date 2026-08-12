'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Script from 'next/script';
import { supabase } from '@/lib/supabase';

interface AssessmentData {
  title: string;
  description: string;
  content: any[];
  employee_name: string;
  responses: any;
  signature_data: string | null;
  signed_date: string;
  acknowledged: boolean;
}

export default function ViewAssessmentPage() {
  const params = useParams();
  const assignmentId = params.id as string;
  const router = useRouter();

  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      fetchAssessmentData(assignmentId);
    }
  }, [assignmentId, router]);

  async function fetchAssessmentData(assignmentId: string) {
    try {
      // Fetch response
      const { data: responseData, error: responseError } = await supabase
        .from('assessment_responses')
        .select('*')
        .eq('assignment_id', assignmentId)
        .single();

      if (responseError) throw responseError;

      // Fetch assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assessment_assignments')
        .select('assessment_id, assessment_type, assigned_to')
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;

      // Fetch employee
      const { data: empData } = await supabase
        .from('employees')
        .select('name')
        .eq('id', assignmentData.assigned_to)
        .single();

      // Fetch assessment
      const table = assignmentData.assessment_type === 'risk' ? 'risk_assessments' : 'chemical_assessments';
      const { data: assessData } = await supabase
        .from(table)
        .select('*')
        .eq('id', assignmentData.assessment_id)
        .single();

      setAssessment({
        title: assessData.title,
        description: assessData.description,
        content: assessData.content || [],
        employee_name: empData?.name || 'Unknown',
        responses: responseData.responses || {},
        signature_data: responseData.signature_data,
        signed_date: responseData.signed_date,
        acknowledged: responseData.checkbox_acknowledged
      });
    } catch (err) {
      console.error('Error fetching assessment:', err);
      alert('Failed to load assessment');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async function downloadPDF() {
    setDownloading(true);
    try {
      const element = document.getElementById('assessment-content');
      if (!element) {
        alert('Could not find content to download');
        setDownloading(false);
        return;
      }

      // Check if libraries are loaded
      const html2canvas = (window as any).html2canvas;
      const jsPDF = (window as any).jsPDF;

      if (!html2canvas || !jsPDF) {
        alert('PDF libraries are loading. Please try again in a moment.');
        setDownloading(false);
        return;
      }

      // Get current date for filename
      const date = new Date();
      const dateStr = date.toISOString().split('T')[0];
      const employeeName = assessment?.employee_name?.replace(/\s+/g, '_') || 'Assessment';
      const filename = `Assessment_${employeeName}_${dateStr}.pdf`;

      // Create canvas from HTML element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      let heightLeft = (canvas.height * imgWidth) / canvas.width;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, heightLeft);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - canvas.height;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, heightLeft);
        heightLeft -= pageHeight;
      }

      // Download PDF
      pdf.save(filename);
      setDownloading(false);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to download PDF. Please try again.');
      setDownloading(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading assessment...</div>;
  if (!assessment) return <div className="p-8 text-center">Assessment not found</div>;

  return (
    <>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" />

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-800 flex items-center font-semibold"
            >
              ← Back
            </button>
            <button
              onClick={downloadPDF}
              disabled={downloading}
              style={{ backgroundColor: '#f89939' }}
              className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? '⬇️ Generating PDF...' : '⬇️ Download PDF'}
            </button>
          </div>

          <div id="assessment-content" className="bg-white p-12 rounded-lg shadow">
            {/* Header */}
            <div className="mb-8 pb-8 border-b-2">
              <h1 className="text-4xl font-bold mb-2" style={{ color: '#f89939' }}>
                {assessment.title}
              </h1>
              <p className="text-gray-600 mb-6">{assessment.description}</p>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 font-semibold uppercase">Employee</p>
                  <p className="text-lg font-semibold text-gray-800">{assessment.employee_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-semibold uppercase">Signed Date</p>
                  <p className="text-lg font-semibold text-gray-800">{formatDate(assessment.signed_date)}</p>
                </div>
              </div>
            </div>

            {/* Questions and Answers */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#f89939' }}>
                Assessment Responses
              </h2>
              
              {assessment.content && assessment.content.length > 0 ? (
                assessment.content.map((question: any, index: number) => (
                  <div key={index} className="mb-8 pb-8 border-b border-gray-200">
                    <p className="font-semibold text-gray-800 mb-3">
                      {index + 1}. {question.text}
                    </p>
                    <p className="text-sm text-gray-500 mb-2">
                      Type: {question.type.replace('-', ' ').toUpperCase()}
                    </p>
                    
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-700 font-medium">
                        {assessment.responses[question.id] !== undefined 
                          ? String(assessment.responses[question.id]) 
                          : 'No answer provided'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">No questions in this assessment.</p>
              )}
            </div>

            {/* Digital Signature */}
            <div className="mb-12 pb-12 border-b-2">
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#f89939' }}>
                Digital Signature
              </h2>
              
              {assessment.signature_data ? (
                <div className="p-4 border-2 border-gray-300 rounded-lg bg-white">
                  <img 
                    src={assessment.signature_data} 
                    alt="Digital signature" 
                    className="w-full h-auto max-h-40"
                  />
                </div>
              ) : (
                <p className="text-gray-600">No signature provided</p>
              )}
            </div>

            {/* Acknowledgment */}
            <div className="p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-start">
                <span className="text-3xl mr-4 font-bold" style={{ color: '#f89939' }}>
                  {assessment.acknowledged ? '✓' : '✗'}
                </span>
                <div>
                  <p className="font-semibold text-blue-900 text-lg">Assessment Acknowledged</p>
                  <p className="text-sm text-blue-800 mt-1">
                    {assessment.acknowledged 
                      ? 'Employee has acknowledged and signed this assessment on ' + formatDate(assessment.signed_date)
                      : 'Assessment not acknowledged.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t text-center text-gray-500 text-sm">
              <p className="font-semibold">This is an official record of the signed assessment.</p>
              <p>Signed on: {formatDate(assessment.signed_date)}</p>
              <p className="mt-2 text-xs">Document generated on: {formatDate(new Date().toISOString())}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}