import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

import { EmailDeliveryException } from './exceptions/email-delivery.exception.js';
import {
  EmailSender,
  SendEmailVerificationParams,
  SendPasswordResetParams,
} from './email-sender.interface.js';

@Injectable()
export class NodemailerSmtpSender implements EmailSender, OnModuleInit {
  private transporter!: Transporter;
  private fromAddress!: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.fromAddress = this.configService.getOrThrow<string>('SMTP_FROM_ADDRESS');
    this.transporter = createTransport({
      host: this.configService.getOrThrow<string>('SMTP_HOST'),
      port: this.configService.getOrThrow<number>('SMTP_PORT'),
      auth: this.buildAuth(),
    });
  }

  async sendEmailVerification(params: SendEmailVerificationParams): Promise<void> {
    await this.send({
      to: params.toEmail,
      subject: 'Xác thực tài khoản của bạn',
      text: `Vui lòng bấm vào liên kết sau để xác thực email: ${params.verificationUrl}\n\nLiên kết có hiệu lực trong 24 giờ.`,
    });
  }

  async sendPasswordReset(params: SendPasswordResetParams): Promise<void> {
    await this.send({
      to: params.toEmail,
      subject: 'Đặt lại mật khẩu',
      text: `Vui lòng bấm vào liên kết sau để đặt lại mật khẩu: ${params.resetUrl}\n\nLiên kết có hiệu lực trong 24 giờ. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
    });
  }

  private async send(message: { to: string; subject: string; text: string }): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.fromAddress, ...message });
    } catch (error) {
      throw new EmailDeliveryException(error);
    }
  }

  private buildAuth(): { user: string; pass: string } | undefined {
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');
    return user && pass ? { user, pass } : undefined;
  }
}
