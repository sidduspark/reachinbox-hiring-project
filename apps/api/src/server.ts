import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import session from "express-session";
import { env } from "./config/env.js";
import { configureGoogleAuth, passport } from "./services/auth.service.js";
import authRoutes from "./routes/auth.routes.js";
import emailRoutes from "./routes/email.routes.js";
import { emailWorker } from "./workers/email.worker.js";

configureGoogleAuth();

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "reachinbox-api",
    timestamp: new Date().toISOString(),
  });
});

app.use("/auth", authRoutes);
app.use("/emails", emailRoutes);

const server = app.listen(env.PORT, () => {
  console.log(`ReachInbox API running on http://localhost:${env.PORT}`);
  console.log(
    `[email-worker] concurrency=${env.WORKER_CONCURRENCY}`,
  );
});

async function shutdown(signal: string) {
  console.log(`[server] ${signal} received, shutting down...`);

  server.close();

  await emailWorker.close();

  console.log("[server] shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
