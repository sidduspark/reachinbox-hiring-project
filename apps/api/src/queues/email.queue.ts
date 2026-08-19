import { Queue } from "bullmq";
import { redis } from "../database/redis.js";

export const EMAIL_QUEUE = "email-scheduler";

export interface EmailJobData {
  emailId: string;
  userId: string;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: {
      age: 86400,
      count: 5000
    },
    removeOnFail: {
      age: 604800,
      count: 5000
    }
  }
});
