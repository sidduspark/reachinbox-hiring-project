import { Worker } from "bullmq";
import { redis } from "../database/redis.js";
import { prisma } from "../database/prisma.js";
import { env } from "../config/env.js";
import { sendEmail } from "../services/email.service.js";
import {
  acquireSendSlot,
  consumeHourlyLimit,
} from "../services/rate-limit.service.js";
import { EMAIL_QUEUE, EmailJobData } from "../queues/email.queue.js";

export const emailWorker = new Worker<EmailJobData>(
  EMAIL_QUEUE,
  async (job) => {
    const email = await prisma.email.findUnique({
      where: { id: job.data.emailId },
    });

    if (!email) {
      throw new Error(`Email ${job.data.emailId} not found`);
    }

    // Idempotency guard.
    if (email.status === "SENT" || email.status === "CANCELLED") {
      return;
    }

    const hourlyLimit = await consumeHourlyLimit(email.from);

    if (!hourlyLimit.allowed && hourlyLimit.retryAt) {
      await prisma.emailEvent.create({
        data: {
          emailId: email.id,
          event: "RATE_LIMITED",
          details: `Retrying at ${new Date(hourlyLimit.retryAt).toISOString()}`,
        },
      });

      await job.moveToDelayed(hourlyLimit.retryAt, job.token);
      return;
    }

    const sendSlot = await acquireSendSlot();

    if (!sendSlot.allowed && sendSlot.retryAt) {
      await prisma.emailEvent.create({
        data: {
          emailId: email.id,
          event: "THROTTLED",
          details: `Retrying at ${new Date(sendSlot.retryAt).toISOString()}`,
        },
      });

      await job.moveToDelayed(sendSlot.retryAt, job.token);
      return;
    }

    await prisma.email.update({
      where: { id: email.id },
      data: {
        status: "PROCESSING",
        attempts: {
          increment: 1,
        },
      },
    });

    await prisma.emailEvent.create({
      data: {
        emailId: email.id,
        event: "PROCESSING",
      },
    });

    try {
      const result = await sendEmail({
        to: email.to,
        from: email.from,
        subject: email.subject,
        body: email.body,
      });

      await prisma.email.update({
        where: { id: email.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          lastError: null,
        },
      });

      await prisma.emailEvent.create({
        data: {
          emailId: email.id,
          event: "SENT",
          details: result.previewUrl
            ? `Preview: ${result.previewUrl}`
            : result.messageId,
        },
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown email error";

      await prisma.email.update({
        where: { id: email.id },
        data: {
          status: "FAILED",
          lastError: message,
        },
      });

      await prisma.emailEvent.create({
        data: {
          emailId: email.id,
          event: "FAILED",
          details: message,
        },
      });

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: env.WORKER_CONCURRENCY,
  },
);

emailWorker.on("completed", (job) => {
  console.log(`[email-worker] completed job=${job.id}`);
});

emailWorker.on("failed", (job, error) => {
  console.error(
    `[email-worker] failed job=${job?.id ?? "unknown"}: ${error.message}`,
  );
});

emailWorker.on("error", (error) => {
  console.error("[email-worker] error:", error);
});
