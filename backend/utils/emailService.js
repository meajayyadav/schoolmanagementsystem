const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async sendTemporaryPassword(toEmail, teacherName, temporaryPassword, schoolName) {
    const mailOptions = {
      from: {
        name: schoolName,
        address: process.env.EMAIL_USER
      },
      to: toEmail,
      subject: `Welcome to ${schoolName} - Your Teacher Account`,
      html: this.getEmailTemplate(teacherName, temporaryPassword, schoolName),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Temporary password email sent to ${toEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }
  }

  getEmailTemplate(teacherName, temporaryPassword, schoolName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f6f9fc; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px; }
          .password-box { background: #f8f9fa; border: 2px dashed #667eea; padding: 20px; margin: 20px 0; text-align: center; font-size: 24px; font-weight: bold; font-family: 'Courier New', monospace; border-radius: 8px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; color: #856404; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${schoolName}</h1>
          </div>
          <div class="content">
            <p>Dear ${teacherName},</p>
            <p>Your teacher account has been successfully created at ${schoolName}.</p>
            <p>You can access your account using the following temporary password:</p>
            <div class="password-box">
              ${temporaryPassword}
            </div>
            <div class="warning">
              <strong>Important:</strong> Please change your password after your first login for security reasons.
            </div>
            <p>To access your account, please visit: <a href="${process.env.APP_URL}" class="button">School Portal</a></p>
            <p>If you have any questions, please contact the school administration.</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async verifyTransporter() {
    try {
      await this.transporter.verify();
      console.log('✅ Email transporter is ready');
      return true;
    } catch (error) {
      console.error('❌ Email transporter verification failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();