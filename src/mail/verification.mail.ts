import { Injectable } from "@nestjs/common";
import type { Mailable } from "@nestjs/mail";

export interface VerificationMailData {
  displayName: string;
  verificationUrl: string;
}

@Injectable()
export class VerificationMail implements Mailable<VerificationMailData> {
  render({ displayName, verificationUrl }: VerificationMailData) {
    return {
      subject: "验证你的 Life AI 邮箱",
      template: "verification",
      context: { displayName, verificationUrl },
    };
  }
}
