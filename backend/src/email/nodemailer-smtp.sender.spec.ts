import type { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

import { EmailDeliveryException } from './exceptions/email-delivery.exception.js';
import { NodemailerSmtpSender } from './nodemailer-smtp.sender.js';

vi.mock('nodemailer', () => ({
  createTransport: vi.fn(),
}));

interface ConfigValues {
  SMTP_FROM_ADDRESS: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
}

function createConfigServiceStub(values: ConfigValues): ConfigService {
  return {
    getOrThrow: vi.fn((key: string) => {
      const value = values[key as keyof ConfigValues];
      if (value === undefined) {
        throw new Error(`Missing config: ${key}`);
      }
      return value;
    }),
    get: vi.fn((key: string) => values[key as keyof ConfigValues]),
  } as unknown as ConfigService;
}

describe('NodemailerSmtpSender', () => {
  const sendMailMock = vi.fn();
  const createTransportMock = vi.mocked(createTransport);

  beforeEach(() => {
    sendMailMock.mockReset();
    createTransportMock.mockReset();
    createTransportMock.mockReturnValue({
      sendMail: sendMailMock,
    } as unknown as ReturnType<typeof createTransport>);
  });

  function createInitializedSender(
    values: ConfigValues = {
      SMTP_FROM_ADDRESS: 'no-reply@example.com',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: 587,
      SMTP_USER: 'smtp-user',
      SMTP_PASSWORD: 'smtp-pass',
    },
  ): NodemailerSmtpSender {
    const sender = new NodemailerSmtpSender(createConfigServiceStub(values));
    // onModuleInit() đồng bộ (void), không phải Promise — không await.
    sender.onModuleInit();
    return sender;
  }

  describe('onModuleInit', () => {
    it('tạo transporter với host/port đọc từ ConfigService', () => {
      createInitializedSender();
      expect(createTransportMock).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        auth: { user: 'smtp-user', pass: 'smtp-pass' },
      });
    });

    it('auth = undefined khi thiếu SMTP_USER/SMTP_PASSWORD trong config', () => {
      createInitializedSender({
        SMTP_FROM_ADDRESS: 'no-reply@example.com',
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: 587,
      });
      expect(createTransportMock).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        auth: undefined,
      });
    });
  });

  describe('sendEmailVerification', () => {
    it('gọi transporter.sendMail với from/to/subject và verificationUrl trong nội dung', async () => {
      sendMailMock.mockResolvedValue(undefined);
      const sender = createInitializedSender();

      await sender.sendEmailVerification({
        toEmail: 'user@example.com',
        verificationUrl: 'https://app.example.com/verify-email?token=abc123',
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const callArgs = sendMailMock.mock.calls[0][0] as {
        from: string;
        to: string;
        subject: string;
        text: string;
      };
      expect(callArgs.from).toBe('no-reply@example.com');
      expect(callArgs.to).toBe('user@example.com');
      expect(callArgs.text).toContain('https://app.example.com/verify-email?token=abc123');
    });

    it('ném EmailDeliveryException (không phải lỗi thô) khi sendMail thất bại', async () => {
      const smtpError = new Error('Connection timeout');
      sendMailMock.mockRejectedValue(smtpError);
      const sender = createInitializedSender();

      const promise = sender.sendEmailVerification({
        toEmail: 'user@example.com',
        verificationUrl: 'https://app.example.com/verify-email?token=abc123',
      });

      await expect(promise).rejects.toBeInstanceOf(EmailDeliveryException);
      await expect(promise).rejects.toMatchObject({ cause: smtpError });
    });
  });

  describe('sendPasswordReset', () => {
    it('gọi transporter.sendMail với from/to/subject và resetUrl trong nội dung', async () => {
      sendMailMock.mockResolvedValue(undefined);
      const sender = createInitializedSender();

      await sender.sendPasswordReset({
        toEmail: 'user@example.com',
        resetUrl: 'https://app.example.com/reset-password?token=xyz789',
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const callArgs = sendMailMock.mock.calls[0][0] as {
        from: string;
        to: string;
        subject: string;
        text: string;
      };
      expect(callArgs.from).toBe('no-reply@example.com');
      expect(callArgs.to).toBe('user@example.com');
      expect(callArgs.text).toContain('https://app.example.com/reset-password?token=xyz789');
    });

    it('ném EmailDeliveryException khi sendMail thất bại', async () => {
      sendMailMock.mockRejectedValue(new Error('SMTP down'));
      const sender = createInitializedSender();

      await expect(
        sender.sendPasswordReset({
          toEmail: 'user@example.com',
          resetUrl: 'https://app.example.com/reset-password?token=xyz789',
        }),
      ).rejects.toBeInstanceOf(EmailDeliveryException);
    });
  });
});
