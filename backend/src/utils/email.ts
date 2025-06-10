import nodemailer from 'nodemailer'
import { config } from '@/config/env'

export interface EmailOptions {
  to: string
  subject: string
  template: string
  data: Record<string, any>
}

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter(): void {
    try {
      // Use environment variables for email configuration
      if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        this.transporter = nodemailer.createTransporter({
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT || '587'),
          secure: process.env.EMAIL_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        })
        console.log('✅ Email transporter initialized')
      } else {
        console.log('ℹ️ Email configuration not found, using mock email service')
      }
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error)
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const { to, subject, template, data } = options

    try {
      if (!this.transporter) {
        // Mock email sending for development
        console.log('📧 Mock Email Sent:')
        console.log(`To: ${to}`)
        console.log(`Subject: ${subject}`)
        console.log(`Template: ${template}`)
        console.log(`Data:`, data)
        return
      }

      const html = this.generateEmailTemplate(template, data)
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        to,
        subject,
        html
      }

      await this.transporter.sendMail(mailOptions)
      console.log(`✅ Email sent successfully to ${to}`)
    } catch (error) {
      console.error('❌ Failed to send email:', error)
      throw new Error('Failed to send email')
    }
  }

  private generateEmailTemplate(template: string, data: Record<string, any>): string {
    switch (template) {
      case 'password-reset':
        return this.passwordResetTemplate(data)
      case 'email-verification':
        return this.emailVerificationTemplate(data)
      case 'welcome':
        return this.welcomeTemplate(data)
      default:
        return this.defaultTemplate(data)
    }
  }

  private passwordResetTemplate(data: { name: string; resetUrl: string; expiryTime: string }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset Request</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #ffffff; padding: 30px; border: 1px solid #dee2e6; }
          .footer { background-color: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6c757d; }
          .button { background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #333;">Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello ${data.name},</p>
            <p>We received a request to reset your password. If you made this request, click the button below to set a new password:</p>
            <a href="${data.resetUrl}" class="button">Reset Password</a>
            <div class="warning">
              <strong>Important:</strong> This link will expire in ${data.expiryTime}. If you didn't request this reset, you can safely ignore this email.
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6c757d;">${data.resetUrl}</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  private emailVerificationTemplate(data: { name: string; verificationUrl: string }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email Address</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #ffffff; padding: 30px; border: 1px solid #dee2e6; }
          .footer { background-color: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6c757d; }
          .button { background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
          .info { background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #333;">Verify Your Email Address</h1>
          </div>
          <div class="content">
            <p>Hello ${data.name},</p>
            <p>Thank you for signing up! To complete your registration, please verify your email address by clicking the button below:</p>
            <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
            <div class="info">
              <strong>Note:</strong> This verification link will expire in 24 hours for security reasons.
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6c757d;">${data.verificationUrl}</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  private welcomeTemplate(data: { name: string }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #ffffff; padding: 30px; border: 1px solid #dee2e6; }
          .footer { background-color: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #333;">Welcome to Our Platform!</h1>
          </div>
          <div class="content">
            <p>Hello ${data.name},</p>
            <p>Welcome to our platform! We're excited to have you on board.</p>
            <p>You can now start exploring all the features we have to offer. If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            <p>Thank you for joining us!</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  private defaultTemplate(data: Record<string, any>): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .content { background-color: #ffffff; padding: 30px; border: 1px solid #dee2e6; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <p>You have received a notification.</p>
            <pre>${JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>
      </body>
      </html>
    `
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false
    }

    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('Email connection verification failed:', error)
      return false
    }
  }
}

const emailService = new EmailService()

export const sendEmail = (options: EmailOptions) => emailService.sendEmail(options)
export const verifyEmailConnection = () => emailService.verifyConnection() 