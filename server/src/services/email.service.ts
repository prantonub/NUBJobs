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

    return !result.error;
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