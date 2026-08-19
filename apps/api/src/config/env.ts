import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),

  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().default("http://localhost:5173"),

  SESSION_SECRET: z.string().min(16),

  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().default(
    "http://localhost:4000/auth/google/callback"
  ),

  ETHEREAL_HOST: z.string().default("smtp.ethereal.email"),
  ETHEREAL_PORT: z.coerce.number().default(587),
  ETHEREAL_USER: z.string().optional(),
  ETHEREAL_PASSWORD: z.string().optional(),

  WORKER_CONCURRENCY: z.coerce.number().default(5),
  MIN_SEND_DELAY_MS: z.coerce.number().default(2000),
  MAX_EMAILS_PER_HOUR: z.coerce.number().default(200)
});

export const env = schema.parse(process.env);
