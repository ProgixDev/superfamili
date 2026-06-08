import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  EmailChrome,
  emailChangeEmail,
  emailChangeNoticeEmail,
  passwordResetEmail,
  signupVerificationEmail,
} from './email-templates';

/**
 * Thin nodemailer wrapper. The service owns the transporter lifecycle and
 * the "from:"/logo/homepage chrome that every template pulls in — controllers
 * and other services just call `sendX(...)`.
 *
 * In dev we log send failures and swallow them. In prod they throw so the
 * caller can surface an error to the user.
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('email.smtp.host');
    const user = this.config.get<string>('email.smtp.user');
    const password = this.config.get<string>('email.smtp.password');

    if (!host || !user || !password) {
      this.logger.warn(
        'SMTP not configured (missing SMTP_HOST / SMTP_USER / SMTP_PASSWORD). Emails will be logged but not sent.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>('email.smtp.port') ?? 587,
      secure: this.config.get<boolean>('email.smtp.secure') ?? false,
      auth: { user, pass: password },
    });
  }

  private chrome(): EmailChrome {
    return {
      logoUrl: this.config.get<string>('email.logoUrl')!,
      homepageUrl: this.config.get<string>('email.homepageUrl')!,
      fromName: this.config.get<string>('email.fromName')!,
    };
  }

  private async send(to: string, subject: string, html: string) {
    const fromName = this.config.get<string>('email.fromName');
    const fromAddress = this.config.get<string>('email.fromAddress');
    const from = `"${fromName}" <${fromAddress}>`;

    if (!this.transporter) {
      this.logger.log(
        `[DEV] Email suppressed (no SMTP) → to=${to} subject="${subject}"`,
      );
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      this.logger.log(
        `Email sent id=${info.messageId} to=${to} subject="${subject}"`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to send email to=${to} subject="${subject}": ${(err as Error).message}`,
      );
      throw err;
    }
  }

  async sendSignupVerification(
    to: string,
    params: { firstName?: string; code: string; expiresInMinutes: number },
  ) {
    const html = signupVerificationEmail(this.chrome(), params);
    await this.send(
      to,
      `Votre code de vérification ${this.config.get<string>('email.fromName')}`,
      html,
    );
  }

  async sendPasswordReset(
    to: string,
    params: { firstName?: string; code: string; expiresInMinutes: number },
  ) {
    const html = passwordResetEmail(this.chrome(), params);
    await this.send(to, 'Réinitialisation de votre mot de passe', html);
  }

  async sendEmailChangeConfirmation(
    to: string,
    params: {
      firstName?: string;
      code: string;
      expiresInMinutes: number;
      newEmail: string;
    },
  ) {
    const html = emailChangeEmail(this.chrome(), params);
    await this.send(to, 'Confirmez votre nouvelle adresse courriel', html);
  }

  async sendEmailChangeNotice(
    to: string,
    params: { firstName?: string; newEmail: string },
  ) {
    const html = emailChangeNoticeEmail(this.chrome(), params);
    await this.send(to, 'Votre adresse courriel a été modifiée', html);
  }
}
