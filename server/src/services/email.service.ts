import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@nubjobs.com';
const COMPANY_NAME = 'NUBJobs';

/**
 * Send OTP email
 */
export async function sendOTPEmail(email: string, otp: string, name: string): Promise<boolean> {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; margin: 20px 0; border-radius: 8px; }
            .otp-box { background: #e8e8e8; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
            .warning { color: #d32f2f; font-size: 12px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${COMPANY_NAME}</h1>
              <p>Email Verification</p>
            </div>
            
            <div class="content">
              <p>Hello ${name},</p>
              
              <p>Welcome to ${COMPANY_NAME}! Use the code below to verify your email address.</p>
              
              <div class="otp-box">${otp}</div>
              
              <p>This code will expire in 10 minutes.</p>
              
              <p class="warning">⚠️ Never share this code with anyone. ${COMPANY_NAME} staff will never ask for your OTP.</p>
            </div>
            
            <div class="footer">
              <p>If you didn't request this email, please ignore it.</p>
              <p>&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Your ${COMPANY_NAME} Verification Code: ${otp}`,
      html: htmlContent,
    });

    if (result && result.error) {
      console.error('Resend OTP send failed:', result.error);
      return false;
    }

    return true;
    if (result && result.error) {
      console.error('Resend OTP send failed:', result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(email: string, name: string, role: string): Promise<boolean> {
  try {
    const roleText = role === 'STUDENT' ? 'student' : 'employer';
    const actionText = role === 'STUDENT' 
      ? 'Browse and apply for exciting job opportunities'
      : 'Post job listings and find talented candidates';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; margin: 20px 0; border-radius: 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${COMPANY_NAME}</h1>
              <p>Welcome aboard!</p>
            </div>
            
            <div class="content">
              <p>Hello ${name},</p>
              
              <p>Welcome to ${COMPANY_NAME}! We're excited to have you as a ${roleText}.</p>
              
              <p>You can now ${actionText}. Get started by completing your profile and exploring opportunities.</p>
              
              <a href="${process.env.CLIENT_URL}/dashboard" class="button">Go to Dashboard</a>
              
              <p>If you have any questions, feel free to reach out to us.</p>
            </div>
            
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Welcome to ${COMPANY_NAME}!`,
      html: htmlContent,
    });

    return !result.error;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}

/**
 * Send application status update email
 */
export async function sendApplicationStatusEmail(
  email: string,
  studentName: string,
  jobTitle: string,
  companyName: string,
  status: string
): Promise<boolean> {
  try {
    const statusMessages: Record<string, string> = {
      APPLIED: 'Thank you for applying! We will review your application shortly.',
      REVIEWED: 'Your application is being reviewed by the employer.',
      SHORTLISTED: 'Congratulations! You have been shortlisted for this position.',
      INTERVIEWED: 'You have been scheduled for an interview. Check your dashboard for details.',
      HIRED: 'Congratulations! You have been hired! 🎉',
      REJECTED: 'Thank you for your interest. We have decided to move forward with other candidates.',
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; margin: 20px 0; border-radius: 8px; }
            .job-info { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${COMPANY_NAME}</h1>
              <p>Application Update</p>
            </div>
            
            <div class="content">
              <p>Hello ${studentName},</p>
              
              <div class="job-info">
                <strong>Job:</strong> ${jobTitle}<br>
                <strong>Company:</strong> ${companyName}
              </div>
              
              <p><strong>Status: ${status}</strong></p>
              <p>${statusMessages[status] || 'Your application status has been updated.'}</p>
              
              <a href="${process.env.CLIENT_URL}/applications" class="button">View Applications</a>
            </div>
            
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Application Update: ${jobTitle} at ${companyName}`,
      html: htmlContent,
    });

    return !result.error;
  } catch (error) {
    console.error('Error sending application status email:', error);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetLink: string
): Promise<boolean> {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; margin: 20px 0; border-radius: 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
            .warning { color: #d32f2f; font-size: 12px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${COMPANY_NAME}</h1>
              <p>Password Reset Request</p>
            </div>
            
            <div class="content">
              <p>Hello ${name},</p>
              
              <p>We received a request to reset your password. Click the link below to create a new password.</p>
              
              <a href="${resetLink}" class="button">Reset Password</a>
              
              <p>This link will expire in 1 hour.</p>
              
              <p class="warning">⚠️ If you didn't request this, please ignore this email.</p>
            </div>
            
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Reset your password',
      html: htmlContent,
    });

    return !result.error;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}
/**
 * Shared HTML shell for the application-lifecycle emails below.
 * The older templates inline their markup; new ones build on this helper so the
 * subject/body stay consistent across the four application events.
 */
function emailShell(heading: string, bodyHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; margin: 20px 0; border-radius: 8px; }
          .info { background: #fff; border-left: 4px solid #667eea; padding: 12px 16px; border-radius: 6px; margin: 16px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${COMPANY_NAME}</h1>
            <p>${heading}</p>
          </div>
          <div class="content">${bodyHtml}</div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * POST /api/applications — confirmation to the student.
 */
export async function sendApplicationReceivedEmail(
  email: string,
  studentName: string,
  jobTitle: string,
  companyName: string,
  matchScore: number
): Promise<boolean> {
  try {
    const htmlContent = emailShell(
      'Application Received',
      `
        <p>Hello ${studentName},</p>
        <p>Your application has been submitted successfully.</p>
        <div class="info">
          <strong>Job:</strong> ${jobTitle}<br>
          <strong>Company:</strong> ${companyName}<br>
          <strong>Match score:</strong> ${matchScore}%
        </div>
        <p>The employer will review your profile and you'll get an email as soon as the status changes.</p>
        <a href="${process.env.CLIENT_URL}/dashboard/applications" class="button">Track Application</a>
      `
    );

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Application received: ${jobTitle} at ${companyName}`,
      html: htmlContent,
    });

    return !result.error;
  } catch (error) {
    console.error('Error sending application received email:', error);
    return false;
  }
}

/**
 * POST /api/applications — heads-up to the employer.
 */
export async function sendNewApplicationEmail(
  email: string,
  companyName: string,
  studentName: string,
  jobTitle: string,
  matchScore: number,
  applicationId: string
): Promise<boolean> {
  try {
    const htmlContent = emailShell(
      'New Application',
      `
        <p>Hello ${companyName},</p>
        <p><strong>${studentName}</strong> just applied for <strong>${jobTitle}</strong>.</p>
        <div class="info">
          <strong>Match score:</strong> ${matchScore}%<br>
          <strong>Application:</strong> ${applicationId}
        </div>
        <a href="${process.env.CLIENT_URL}/employer/applications/${applicationId}" class="button">Review Candidate</a>
      `
    );

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `New applicant for ${jobTitle}: ${studentName} (${matchScore}% match)`,
      html: htmlContent,
    });

    return !result.error;
  } catch (error) {
    console.error('Error sending new application email:', error);
    return false;
  }
}

/**
 * POST /api/employer/company/verify — alert the admins.
 */
export async function sendVerificationRequestEmail(
  email: string,
  companyName: string,
  reason?: string
): Promise<boolean> {
  try {
    const htmlContent = emailShell(
      'Company Verification Request',
      `
        <p>Hello Admin,</p>
        <p><strong>${companyName}</strong> requested company verification.</p>
        <div class="info">
          <strong>Company:</strong> ${companyName}<br>
          ${reason ? `<strong>Reason:</strong> ${reason}` : ''}
        </div>
        <a href="${process.env.CLIENT_URL}/admin/companies" class="button">Open Admin Panel</a>
      `
    );

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Verification requested by ${companyName}`,
      html: htmlContent,
    });

    return !result.error;
  } catch (error) {
    console.error('Error sending verification request email:', error);
    return false;
  }
}

/**
 * POST /api/jobs — alert every admin that a posting is waiting for approval.
 */
export async function sendJobPendingApprovalEmail(
  email: string,
  companyName: string,
  jobTitle: string,
  jobId: string
): Promise<boolean> {
  try {
    const htmlContent = emailShell(
      'Job Pending Approval',
      `
        <p>Hello Admin,</p>
        <p><strong>${companyName}</strong> posted a new job that needs your review.</p>
        <div class="info">
          <strong>Job:</strong> ${jobTitle}<br>
          <strong>Job id:</strong> ${jobId}
        </div>
        <a href="${process.env.CLIENT_URL}/admin/jobs" class="button">Review Job</a>
      `
    );

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Job pending approval: ${jobTitle} (${companyName})`,
      html: htmlContent,
    });

    return !result.error;
  } catch (error) {
    console.error('Error sending job pending approval email:', error);
    return false;
  }
}
