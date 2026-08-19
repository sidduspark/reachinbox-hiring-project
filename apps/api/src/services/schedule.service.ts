import { prisma } from "../database/prisma.js";
import { emailQueue } from "../queues/email.queue.js";

export interface ScheduleEmailInput {
  userId: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  scheduledAt: Date;
}

export async function scheduleEmail(input: ScheduleEmailInput) {
  if (input.scheduledAt.getTime() <= Date.now()) {
    throw new Error("scheduledAt must be in the future");
  }

  const email = await prisma.email.create({
    data: {
      userId: input.userId,
      to: input.to,
      from: input.from,
      subject: input.subject,
      body: input.body,
      scheduledAt: input.scheduledAt,
      status: "SCHEDULED",
    },
  });

  try {
    const delay = Math.max(
      input.scheduledAt.getTime() - Date.now(),
      0,
    );

    const job = await emailQueue.add(
      `send-${email.id}`,
      {
        emailId: email.id,
        userId: input.userId,
      },
      {
        delay,
        jobId: email.id,
      },
    );

    await prisma.email.update({
      where: { id: email.id },
      data: { jobId: String(job.id) },
    });

    await prisma.emailEvent.create({
      data: {
        emailId: email.id,
        event: "SCHEDULED",
        details: `BullMQ job ${job.id}`,
      },
    });

    return {
      email,
      jobId: job.id,
    };
  } catch (error) {
    await prisma.email.delete({
      where: { id: email.id },
    });

    throw error;
  }
}
