import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export interface SendEmailInput {
  to: string;
  from: string;
  subject: string;
  body: string;
}

export async function sendEmail(input: SendEmailInput) {
  if (!env.ETHEREAL_USER || !env.ETHEREAL_PASSWORD) {
    throw new Error("Ethereal SMTP credentials are not configured");
  }

  const transporter = nodemailer.createTransport({
    host: env.ETHEREAL_HOST,
    port: env.ETHEREAL_PORT,
    secure: env.ETHEREAL_PORT === 465,
    auth: {
      user: env.ETHEREAL_USER,
      pass: env.ETHEREAL_PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: input.from,
    to: input.to,
    subject: input.subject,
    text: input.body,
  });

  return {
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info) || null,
  };
}
