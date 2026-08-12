import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendAssessmentAssignedEmail(
  employeeEmail: string,
  employeeName: string,
  assessmentTitle: string,
  dueDate?: string
) {
  try {
    console.log(`Sending assessment email to: ${employeeEmail}`);

    const result = await resend.emails.send({
  from: 'hr@ldrindustries.com.au', 
      to: employeeEmail,
      subject: `New Assessment: ${assessmentTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f89939; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">New Assessment Assigned</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="color: #333; font-size: 16px;">Hi <strong>${employeeName}</strong>,</p>
            
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              You have been assigned a new assessment:
            </p>
            
            <div style="background-color: white; padding: 15px; border-left: 4px solid #f89939; margin: 20px 0;">
              <p style="margin: 0; color: #333; font-size: 16px; font-weight: bold;">
                📋 ${assessmentTitle}
              </p>
            </div>
            
            ${dueDate ? `
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0;">
                <p style="margin: 0; color: #92400e; font-weight: bold;">
                  ⏰ Due Date: ${new Date(dueDate).toLocaleDateString('en-AU', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
            ` : ''}
            
            <p style="color: #555; font-size: 15px; line-height: 1.6; margin-top: 20px;">
              Please log in to the HR Portal to complete and sign the assessment.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="http://localhost:3000/dashboard/employee/my-assessments" style="background-color: #f89939; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                View Assessment
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #999; font-size: 13px; margin: 0;">
              Best regards,<br>
              <strong>LDR Industries HR Team</strong>
            </p>
          </div>
        </div>
      `
    });

    console.log('Assessment assigned email sent successfully:', result);
    
    if (result.error) {
      console.error('Email error:', result.error);
      return null;
    }

    return result;
  } catch (error) {
    console.error('Error sending assessment email:', error);
    return null;
  }
}

export async function sendReportSubmittedEmail(
  managerEmail: string,
  managerName: string,
  employeeName: string,
  reportType: string
) {
  try {
    console.log(`Sending report notification to: ${managerEmail}`);

    const result = await resend.emails.send({
    from: 'hr@ldrindustries.com.au',
      to: managerEmail,
      subject: `New ${reportType} Report from ${employeeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f89939; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">New Report Submitted</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="color: #333; font-size: 16px;">Hi <strong>${managerName}</strong>,</p>
            
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              <strong>${employeeName}</strong> has submitted a new report:
            </p>
            
            <div style="background-color: white; padding: 15px; border-left: 4px solid #f89939; margin: 20px 0;">
              <p style="margin: 0; color: #333; font-size: 16px; font-weight: bold;">
                ${reportType === 'Hazard' ? '⚠️' : reportType === 'Incident' ? '🚨' : '💡'} 
                ${reportType} Report
              </p>
            </div>
            
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              Please log in to the HR Portal to review and manage this report.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="http://localhost:3000/dashboard/manager/all-reports" style="background-color: #f89939; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                View Report
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #999; font-size: 13px; margin: 0;">
              Best regards,<br>
              <strong>LDR Industries HR System</strong>
            </p>
          </div>
        </div>
      `
    });

    console.log('Report submitted email sent successfully:', result);
    
    if (result.error) {
      console.error('Email error:', result.error);
      return null;
    }

    return result;
  } catch (error) {
    console.error('Error sending report email:', error);
    return null;
  }
}

export async function sendAssessmentSignedEmail(
  managerEmail: string,
  managerName: string,
  employeeName: string,
  assessmentTitle: string
) {
  try {
    console.log(`Sending assessment signed notification to: ${managerEmail}`);

    const result = await resend.emails.send({
      from: 'hr@ldrindustries.com.au',
      to: managerEmail,
      subject: `Assessment Completed: ${assessmentTitle} by ${employeeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f89939; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">Assessment Signed</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="color: #333; font-size: 16px;">Hi <strong>${managerName}</strong>,</p>
            
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              <strong>${employeeName}</strong> has completed and signed the assessment:
            </p>
            
            <div style="background-color: #dcfce7; padding: 15px; border-left: 4px solid #22c55e; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 0; color: #166534; font-size: 16px; font-weight: bold;">
                ✓ ${assessmentTitle}
              </p>
            </div>
            
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              You can now review the signed assessment in the HR Portal.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="http://localhost:3000/dashboard/manager" style="background-color: #f89939; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                View Signed Assessments
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #999; font-size: 13px; margin: 0;">
              Best regards,<br>
              <strong>LDR Industries HR System</strong>
            </p>
          </div>
        </div>
      `
    });

    console.log('Assessment signed email sent successfully:', result);
    
    if (result.error) {
      console.error('Email error:', result.error);
      return null;
    }

    return result;
  } catch (error) {
    console.error('Error sending assessment signed email:', error);
    return null;
  }
}