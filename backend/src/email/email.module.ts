import { Module } from '@nestjs/common';

import { EMAIL_SENDER } from './email-sender.interface.js';
import { NodemailerSmtpSender } from './nodemailer-smtp.sender.js';

@Module({
  providers: [{ provide: EMAIL_SENDER, useClass: NodemailerSmtpSender }],
  exports: [EMAIL_SENDER],
})
export class EmailModule {}
