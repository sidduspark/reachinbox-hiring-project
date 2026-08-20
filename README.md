# ReachInbox Hiring Assignment

A full-stack email outreach application built for the ReachInbox hiring assignment.

## Tech Stack

### Frontend
- React
- Vite
- TypeScript

### Backend
- Node.js
- Express
- TypeScript
- Passport
- Google OAuth
- Nodemailer

### Database and Queue
- PostgreSQL
- Prisma ORM
- Redis
- BullMQ

### Development
- pnpm
- Docker Compose
- Vite
- tsx

## Features

- Google OAuth authentication
- Email composition
- Email scheduling
- Scheduled email processing using BullMQ
- Redis-backed job queue
- PostgreSQL persistence
- Email delivery using SMTP
- Sent email history
- Failed email tracking
- Worker concurrency configuration
- Configurable minimum send delay
- Hourly email sending limit
- Responsive email outreach dashboard

## Architecture

The application follows a frontend/backend architecture with PostgreSQL for persistent data, Redis and BullMQ for background email scheduling, and SMTP for email delivery.

```text
                         React + Vite
                              |
                              | HTTP API
                              v
                       Node.js + Express
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
         PostgreSQL         Redis            SMTP
              |               |               |
           Prisma          BullMQ          Nodemailer
                              |
                              v
                        Email Worker
                              |
                              v
                       Email Delivery
```

### Request and Email Flow

1. The user signs in using Google OAuth.
2. The frontend communicates with the Express API.
3. Email and scheduling information is stored in PostgreSQL through Prisma.
4. Scheduled email jobs are added to a BullMQ queue backed by Redis.
5. The email worker processes queued jobs according to the configured concurrency and sending limits.
6. Nodemailer sends the email through the configured SMTP server.
7. The email status is updated in PostgreSQL as sent or failed.
8. The frontend displays scheduled and delivery history.

## Project Structure

```text
reachinbox-hiring-project/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   └── src/
│   │       ├── config/
│   │       ├── database/
│   │       ├── routes/
│   │       ├── services/
│   │       ├── workers/
│   │       └── server.ts
│   │
│   └── web/
│       └── src/
│           ├── assets/
│           ├── App.tsx
│           ├── App.css
│           ├── index.css
│           └── main.tsx
│
├── docker-compose.yml
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── README.md
```

## Local Setup

### Prerequisites

Install the following:

- Node.js
- pnpm
- Docker Desktop

### Install Dependencies

From the project root:

```bash
pnpm install
```

### Start PostgreSQL and Redis

Start the required infrastructure services using Docker Compose:

```bash
docker compose up -d
```

Check the running services:

```bash
docker compose ps
```

Both PostgreSQL and Redis should be running and healthy.

### Environment Configuration

Create an environment file at:

```text
apps/api/.env
```

Configure the required environment variables for:

- PostgreSQL database connection
- Redis connection
- Session secret
- Google OAuth
- SMTP
- Worker concurrency
- Email sending delay
- Hourly email sending limit

Example structure:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reachinbox"

PORT="4001"
FRONTEND_URL="http://localhost:5173"

SESSION_SECRET="your-session-secret"

REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:4001/auth/google/callback"

ETHEREAL_HOST="smtp.ethereal.email"
ETHEREAL_PORT="587"
ETHEREAL_USER="your-smtp-user"
ETHEREAL_PASSWORD="your-smtp-password"

WORKER_CONCURRENCY="5"
MIN_SEND_DELAY_MS="2000"
MAX_EMAILS_PER_HOUR="200"
```

Do not commit `.env` files, OAuth secrets, SMTP passwords, session secrets, or other credentials to the repository.

### Database Setup

Generate the Prisma client:

```bash
pnpm --filter api db:generate
```

Run the database migrations:

```bash
pnpm --filter api db:migrate
```

### Start the Application

From the project root:

```bash
pnpm dev
```

This starts:

- Frontend using Vite
- Backend using Express and tsx

The default development URLs are:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:4001
```

If port 5173 is already in use, Vite may automatically select another available port.

## Backend Health Check

The backend exposes a health endpoint:

```text
GET /health
```

Example response:

```json
{
  "status": "ok",
  "service": "reachinbox-api",
  "timestamp": "2026-08-19T17:51:25.299Z"
}
```

## Authentication

Google OAuth is implemented using Passport.

The configured callback URL should match the callback URL registered in the Google Cloud OAuth credentials:

```text
http://localhost:4001/auth/google/callback
```

The frontend uses the authenticated session to access protected application functionality.

## Email Scheduling

When an email is scheduled:

1. The email details are stored in PostgreSQL.
2. A job is added to the `email-scheduler` BullMQ queue.
3. Redis stores and manages the queue state.
4. The email worker waits for the scheduled job.
5. The worker processes the job when it becomes available.
6. Nodemailer sends the email through SMTP.
7. The database record is updated with the resulting delivery status.

## Queue Configuration

BullMQ is configured with the following queue:

```text
email-scheduler
```

The worker supports configurable concurrency through:

```env
WORKER_CONCURRENCY="5"
```

Completed and failed jobs are automatically retained according to the configured BullMQ cleanup policies.

## Email Sending Controls

The application supports configurable email sending controls:

```env
MIN_SEND_DELAY_MS="2000"
MAX_EMAILS_PER_HOUR="200"
```

### Minimum Send Delay

`MIN_SEND_DELAY_MS` controls the minimum delay between email sends.

### Hourly Sending Limit

`MAX_EMAILS_PER_HOUR` limits the number of emails that can be sent within an hour.

These settings can be adjusted through the backend environment configuration.

## SMTP

Nodemailer is used for SMTP email delivery.

The SMTP configuration is provided through environment variables:

```env
ETHEREAL_HOST="smtp.ethereal.email"
ETHEREAL_PORT="587"
ETHEREAL_USER="your-smtp-user"
ETHEREAL_PASSWORD="your-smtp-password"
```

The SMTP provider can be changed by updating these configuration values.

## Database

PostgreSQL is used as the application's persistent database.

Prisma ORM provides:

- Database schema management
- Type-safe database access
- Migration support
- Generated database client

The database connection is configured through:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reachinbox"
```

## Redis

Redis is used as the backing store for BullMQ.

Default local configuration:

```env
REDIS_HOST="localhost"
REDIS_PORT="6379"
```

Redis can be started using:

```bash
docker compose up -d redis
```

## Docker Services

Docker Compose provides the local infrastructure required by the application.

The main services are:

```text
PostgreSQL
Redis
```

Check their status with:

```bash
docker compose ps
```

View Redis logs with:

```bash
docker compose logs redis --tail=30
```

## Development Commands

Install dependencies:

```bash
pnpm install
```

Start development servers:

```bash
pnpm dev
```

Build the API:

```bash
pnpm --filter api build
```

Run API type checking:

```bash
pnpm --filter api typecheck
```

Generate Prisma client:

```bash
pnpm --filter api db:generate
```

Run Prisma migrations:

```bash
pnpm --filter api db:migrate
```

Open Prisma Studio:

```bash
pnpm --filter api db:studio
```

## Implementation Summary

The project implements a complete email outreach workflow consisting of:

- Google-based authentication
- Email composition
- Immediate and scheduled email workflows
- Persistent email records
- Background job processing
- Redis-backed BullMQ queue
- Configurable email worker concurrency
- SMTP-based email delivery
- Delivery status tracking
- Failed email tracking
- Sent email history
- Rate and delay controls
- React-based dashboard

## Submission Notes

Before submitting the assignment:

1. Push the latest source code to the GitHub repository.
2. Ensure the README contains setup instructions, architecture details, and feature implementation details.
3. Do not commit `.env` files or credentials.
4. Verify that the application starts successfully.
5. Verify PostgreSQL and Redis are running.
6. Verify the backend health endpoint.
7. Verify email scheduling and delivery behavior.
8. Provide the hosted assignment URL in the submission form.
9. Provide the assignment demo video URL.
10. Invite the required GitHub users to the repository.
11. Confirm that the submitted work is not plagiarized.