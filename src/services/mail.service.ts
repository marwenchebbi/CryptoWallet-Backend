import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Initialize Nodemailer transporter
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('EMAIL_PORT', 587),
      secure: false, // Use TLS
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
      logger: true,
      debug: true,
    });
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    //const verificationUrl = `${this.configService.get<string>('FRONTEND_URL')}/verify-email?token=${token}`;
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM', 'no-reply@yourapp.com'),
      to,
      subject: 'Verify Your Email Address',
      html: `
        <h2>Email Verification</h2>
        <p>Please verify your email by clicking the link below: ${token}</p>
        <a href="google.com" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new InternalServerErrorException('Failed to send verification email');
    }
  }
}