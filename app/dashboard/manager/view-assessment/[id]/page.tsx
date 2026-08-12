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
    <></>