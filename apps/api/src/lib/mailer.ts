import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export const mailer = nodemailer.createTransport({
  host: env.ETHEREAL_HOST,
  port: env.ETHEREAL_PORT,
  secure: env.ETHEREAL_PORT === 465,
  auth:
    env.ETHEREAL_USER && env.ETHEREAL_PASSWORD
      ? {
          user: env.ETHEREAL_USER,
          pass: env.ETHEREAL_PASSWORD,
        }
      : undefined,
});
