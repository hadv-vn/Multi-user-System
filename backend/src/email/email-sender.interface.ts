export interface SendEmailVerificationParams {
  toEmail: string;
  verificationUrl: string;
}

export interface SendPasswordResetParams {
  toEmail: string;
  resetUrl: string;
}

export interface EmailSender {
  sendEmailVerification(params: SendEmailVerificationParams): Promise<void>;
  sendPasswordReset(params: SendPasswordResetParams): Promise<void>;
}

export const EMAIL_SENDER = Symbol('EmailSender');
