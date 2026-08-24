import { supabase } from './supabase';

export async function getDashboardStats() {
  try {
    const [hazardRes, incidentRes, nearmissRes, pendingRes, signedRes] = await Promise.all([
      supabase.from('hazard_reports').select('id', { count: 'exact' }).eq('status', 'submitted'),
      supabase.from('incident_reports').select('id', { count: 'exact' }).eq('status', 'submitted'),
      supabase.from('near_miss_reports').select('id', { count: 'exact' }).eq('status', 'submitted'),
      supabase.from('assessment_assignments').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('assessment_assignments').select('id', { count: 'exact' }).eq('status', 'signed')
    ]);

    return {
      hazardReports: hazardRes.count || 0,
      incidentReports: incidentRes.count || 0,
      nearmissReports: nearmissRes.count || 0,
      pendingAssessments: pendingRes.count || 0,
      signedAssessments: signedRes.count || 0
    };
  } catch (err) {
    console.error('Error fetching stats:', err);
    return {
      hazardReports: 0,
      incidentReports: 0,
      nearmissReports: 0,
      pendingAssessments: 0,
      signedAssessments: 0
    };
  }
}

export async function getEmployeeStats(userId: string) {
  try {
    const [pendingRes, signedRes, myReportsRes, pendingTrainingRes, pendingCertificationsRes] = await Promise.all([
      supabase.from('assessment_assignments').select('id', { count: 'exact' }).eq('assigned_to', userId).eq('status', 'pending'),
      supabase.from('assessment_assignments').select('id', { count: 'exact' }).eq('assigned_to', userId).eq('status', 'signed'),
      supabase.from('hazard_reports').select('id', { count: 'exact' }).eq('submitted_by', userId),
      supabase.from('training_records').select('id', { count: 'exact' }).eq('employee_id', userId).eq('status', 'pending'),
      supabase.from('certifications').select('id', { count: 'exact' }).eq('employee_id', userId).eq('status', 'pending')
    ]);

    return {
      pendingAssessments: pendingRes.count || 0,
      signedAssessments: signedRes.count || 0,
      myReports: myReportsRes.count || 0,
      pendingTraining: pendingTrainingRes.count || 0,
      pendingCertifications: pendingCertificationsRes.count || 0
    };
  } catch (err) {
    console.error('Error fetching employee stats:', err);
    return {
      pendingAssessments: 0,
      signedAssessments: 0,
      myReports: 0,
      pendingTraining: 0,
      pendingCertifications: 0
    };
  }
}