import { prisma } from "../database/prisma.js";
import { emailQueue } from "../queues/email.queue.js";

export interface BulkScheduleInput {
  userId: string;
  emails: string[];
  from: string;
  subject: string;
  body: string;
  startAt: Date;
  delayBetweenEmails: number;
}

export async function scheduleBulkEmails(input: BulkScheduleInput) {
  if (input.emails.length === 0) {
    throw new Error("No valid email addresses provided");
  }

  if (input.startAt.getTime() <= Date.now()) {
    throw new Error("startAt must be in the future");
  }

  const delay = Math.max(input.delayBetweenEmails, 0);

  const scheduled = input.emails.map((to, index) => ({
    userId: input.userId,
    to,
    from: input.from,
    subject: input.subject,
    body: input.body,
    scheduledAt: new Date(
      input.startAt.getTime() + index * delay,
    ),
    status: "SCHEDULED" as const,
  }));

  const created = await prisma.email.createManyAndReturn({
    data: scheduled,
  });

  try {
    const jobs = await Promise.all(
      created.map((email) =>
        emailQueue.add(
          `send-${email.id}`,
          {
            emailId: email.id,
            userId: input.userId,
          },
          {
            delay: Math.max(email.scheduledAt.getTime() - Date.now(), 0),
            jobId: email.id,
          },
        ),
      ),
    );

    await prisma.$transaction(
      jobs.map((job) =>
        prisma.email.update({
          where: { id: String(job.id) },
          data: {
            jobId: String(job.id),
          },
        }),
      ),
    );

    await prisma.$transaction(
      created.map((email) =>
        prisma.emailEvent.create({
          data: {
            emailId: email.id,
            event: "SCHEDULED",
            details: `BullMQ job ${email.id}`,
          },
        }),
      ),
    );

    return {
      count: created.length,
      firstScheduledAt: created[0].scheduledAt,
      lastScheduledAt: created[created.length - 1].scheduledAt,
    };
  } catch (error) {
    // Remove database records if queue creation fails.
    await prisma.email.deleteMany({
      where: {
        id: {
          in: created.map((email) => email.id),
        },
      },
    });

    throw error;
  }
}
