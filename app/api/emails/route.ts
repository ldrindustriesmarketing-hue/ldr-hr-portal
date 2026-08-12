import { NextRequest, NextResponse } from 'next/server';
import { 
  sendAssessmentAssignedEmail, 
  sendReportSubmittedEmail,
  sendAssessmentSignedEmail 
} from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    if (type === 'assessment-assigned') {
      await sendAssessmentAssignedEmail(
        data.employeeEmail,
        data.employeeName,
        data.assessmentTitle,
        data.dueDate
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