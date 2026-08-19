import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../database/prisma.js";
import { scheduleEmail } from "../services/schedule.service.js";
import { scheduleBulkEmails } from "../services/bulk-schedule.service.js";
import { parseRecipientFile } from "../services/csv.service.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

const scheduleSchema = z.object({
  to: z.string().email(),
  from: z.string().email(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  scheduledAt: z.string().datetime(),
});

const bulkScheduleSchema = z.object({
  from: z.string().email(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  startAt: z.string().datetime(),
  delayBetweenEmails: z.coerce.number().int().min(0).max(86_400_000),
});

function requireAuth(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Not authenticated",
    });
  }

  next();
}

router.use(requireAuth);

router.post("/", async (req, res) => {
  try {
    const data = scheduleSchema.parse(req.body);
    const user = req.user as { id: string };

    const result = await scheduleEmail({
      userId: user.id,
      ...data,
      scheduledAt: new Date(data.scheduledAt),
    });

    res.status(201).json({
      success: true,
      data: {
        id: result.email.id,
        jobId: result.jobId,
        to: result.email.to,
        from: result.email.from,
        subject: result.email.subject,
        scheduledAt: result.email.scheduledAt,
        status: result.email.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.issues,
      });
      return;
    }

    const message =
      error instanceof Error ? error.message : "Failed to schedule email";

    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

router.post(
  "/bulk",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: "CSV or text file is required",
        });
        return;
      }

      const data = bulkScheduleSchema.parse(req.body);
      const user = req.user as { id: string };

      const content = req.file.buffer.toString("utf8");
      const parsed = parseRecipientFile(content);

      if (parsed.emails.length === 0) {
        res.status(400).json({
          success: false,
          error: "No valid email addresses found",
          data: {
            detected: 0,
            invalid: parsed.invalid.length,
          },
        });
        return;
      }

      const result = await scheduleBulkEmails({
        userId: user.id,
        emails: parsed.emails,
        from: data.from,
        subject: data.subject,
        body: data.body,
        startAt: new Date(data.startAt),
        delayBetweenEmails: data.delayBetweenEmails,
      });

      res.status(201).json({
        success: true,
        data: {
          detected: parsed.emails.length + parsed.invalid.length,
          valid: parsed.emails.length,
          invalid: parsed.invalid.length,
          scheduled: result.count,
          firstScheduledAt: result.firstScheduledAt,
          lastScheduledAt: result.lastScheduledAt,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid request",
          details: error.issues,
        });
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Failed to schedule emails";

      res.status(500).json({
        success: false,
        error: message,
      });
    }
  },
);

router.get("/scheduled", async (req, res) => {
  try {
    const user = req.user as { id: string };

    const emails = await prisma.email.findMany({
      where: {
        userId: user.id,
        status: {
          in: ["SCHEDULED", "PROCESSING"],
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
      select: {
        id: true,
        to: true,
        from: true,
        subject: true,
        scheduledAt: true,
        status: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: emails,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch scheduled emails";

    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

router.get("/sent", async (req, res) => {
  try {
    const user = req.user as { id: string };

    const emails = await prisma.email.findMany({
      where: {
        userId: user.id,
        status: {
          in: ["SENT", "FAILED"],
        },
      },
      orderBy: {
        sentAt: "desc",
      },
      select: {
        id: true,
        to: true,
        from: true,
        subject: true,
        sentAt: true,
        status: true,
        lastError: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: emails,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch sent emails";

    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export default router;


