import { NextRequest, NextResponse } from 'next/server';
import {
  sendAssessmentAssignedEmail,
  sendReportSubmittedEmail,
  sendAssessmentSignedEmail,
  sendTrainingAssignedEmail,
  sendCertificationAssignedEmail
} from '@/lib/email';
import { supabaseForRequest } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    // These are all triggered from manager-only pages (assign assessments,
    // add training record, add certification) or from a report-submission
    // flow that any authenticated employee can trigger - require at least
    // a valid session so this can't be used to spam arbitrary emails
    // through the org's Resend account.
    const supabase = supabaseForRequest(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { type, ...data } = body;

    if (type === 'assessment-assigned') {
      await sendAssessmentAssignedEmail(
        data.employeeEmail,
        data.employeeName,
        data.assessmentTitle,
        data.dueDate
      );
    } else if (type === 'training-assigned') {
      await sendTrainingAssignedEmail(
        data.employeeEmail,
        data.employeeName,
        data.trainingTitle
      );
    } else if (type === 'certification-assigned') {
      await sendCertificationAssignedEmail(
        data.employeeEmail,
        data.employeeName,
        data.certificationTitle
      );
    } else if (type === 'report-submitted') {
      await sendReportSubmittedEmail(
        data.managerEmail,
        data.managerName,
        data.employeeName,
        data.reportType
      );
    } else if (type === 'assessment-signed') {
      await sendAssessmentSignedEmail(
        data.managerEmail,
        data.managerName,
        data.employeeName,
        data.assessmentTitle
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
