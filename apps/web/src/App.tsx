import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://localhost:4001";

type EmailStatus = "SCHEDULED" | "PROCESSING" | "SENT" | "FAILED";

interface Email {
  id: string;
  to: string;
  from: string;
  subject: string;
  scheduledAt?: string;
  sentAt?: string;
  status: EmailStatus;
  lastError?: string | null;
  createdAt: string;
}

type View = "overview" | "scheduled" | "sent" | "compose";

function App() {
  const [view, setView] = useState<View>("overview");
  const [scheduled, setScheduled] = useState<Email[]>([]);
  const [sent, setSent] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    to: "",
    from: "",
    subject: "",
    body: "",
    scheduledAt: "",
  });

  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const api = useMemo(
    () =>
      axios.create({
        baseURL: API_URL,
        withCredentials: true,
      }),
    [],
  );

  const loadEmails = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [scheduledResponse, sentResponse] = await Promise.all([
        api.get("/emails/scheduled"),
        api.get("/emails/sent"),
      ]);

      setScheduled(scheduledResponse.data.data ?? []);
      setSent(sentResponse.data.data ?? []);
      setAuthenticated(true);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setAuthenticated(false);
      } else {
        setError("Unable to connect to the ReachInbox API.");
      }
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadEmails();
  }, [loadEmails]);

  async function handleSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSending(true);
      setError("");
      setSuccessMessage("");

      await api.post("/emails", {
        ...form,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      });

      setSuccessMessage("Email scheduled successfully.");

      setForm({
        to: "",
        from: "",
        subject: "",
        body: "",
        scheduledAt: "",
      });

      await loadEmails();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.error ??
            "Failed to schedule the email.",
        );
      } else {
        setError("Failed to schedule the email.");
      }
    } finally {
      setSending(false);
    }
  }

  function openCompose() {
    setSuccessMessage("");
    setError("");
    setView("compose");
  }

  const totalEmails = scheduled.length + sent.length;
  const failedEmails = sent.filter(
    (email) => email.status === "FAILED",
  ).length;

  const stats = [
    {
      label: "Total emails",
      value: totalEmails,
      icon: "✉",
      description: "Across all campaigns",
    },
    {
      label: "Scheduled",
      value: scheduled.length,
      icon: "◷",
      description: "Waiting to be sent",
    },
    {
      label: "Sent",
      value: sent.filter((email) => email.status === "SENT").length,
      icon: "✓",
      description: "Successfully delivered",
    },
    {
      label: "Failed",
      value: failedEmails,
      icon: "!",
      description: "Needs attention",
    },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <span>R</span>
          </div>

          <div>
            <div className="brand-name">ReachInbox</div>
            <div className="brand-caption">Email infrastructure</div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Workspace</div>

          <button
            className={`nav-item ${view === "overview" ? "active" : ""}`}
            onClick={() => setView("overview")}
          >
            <span className="nav-icon">⌂</span>
            Overview
          </button>

          <button
            className={`nav-item ${view === "scheduled" ? "active" : ""}`}
            onClick={() => setView("scheduled")}
          >
            <span className="nav-icon">◷</span>
            Scheduled
            {scheduled.length > 0 && (
              <span className="nav-count">{scheduled.length}</span>
            )}
          </button>

          <button
            className={`nav-item ${view === "sent" ? "active" : ""}`}
            onClick={() => setView("sent")}
          >
            <span className="nav-icon">✓</span>
            Sent
          </button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Actions</div>

          <button className="nav-item" onClick={openCompose}>
            <span className="nav-icon">＋</span>
            Compose
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot" />
            <div>
              <strong>API Online</strong>
              <span>localhost:4001</span>
            </div>
          </div>

          <div className="user-card">
            <div className="avatar">A</div>
            <div className="user-info">
              <strong>Workspace</strong>
              <span>Developer account</span>
            </div>
            <span className="user-menu">•••</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="breadcrumb">
              Workspace <span>/</span> {view}
            </div>

            <h1>
              {view === "overview" && "Good afternoon"}
              {view === "scheduled" && "Scheduled emails"}
              {view === "sent" && "Sent emails"}
              {view === "compose" && "Compose email"}
            </h1>
          </div>

          <div className="topbar-actions">
            <div className="connection-pill">
              <span className="status-dot" />
              All systems operational
            </div>

            <button className="icon-button" title="Refresh" onClick={() => void loadEmails()}>
              ↻
            </button>

            <button className="compose-button" onClick={openCompose}>
              <span>＋</span>
              Compose
            </button>
          </div>
        </header>

        {!authenticated && (
          <section className="auth-banner">
            <div>
              <strong>Authentication required</strong>
              <p>
                Connect your Google account to access your ReachInbox
                workspace.
              </p>
            </div>

            <a
              href={`${API_URL}/auth/google`}
              className="google-button"
            >
              Continue with Google
            </a>
          </section>
        )}

        {error && (
          <div className="alert error-alert">
            <span>!</span>
            <div>
              <strong>Something went wrong</strong>
              <p>{error}</p>
            </div>
            <button onClick={() => setError("")}>×</button>
          </div>
        )}

        {successMessage && (
          <div className="alert success-alert">
            <span>✓</span>
            <div>
              <strong>Success</strong>
              <p>{successMessage}</p>
            </div>
            <button onClick={() => setSuccessMessage("")}>×</button>
          </div>
        )}

        {view === "overview" && (
          <Overview
            stats={stats}
            scheduled={scheduled}
            sent={sent}
            loading={loading}
            onCompose={openCompose}
            onViewScheduled={() => setView("scheduled")}
            onViewSent={() => setView("sent")}
          />
        )}

        {view === "scheduled" && (
          <EmailTable
            title="Upcoming emails"
            description="Emails currently waiting in the delivery queue."
            emails={scheduled}
            loading={loading}
            emptyMessage="No emails are currently scheduled."
          />
        )}

        {view === "sent" && (
          <EmailTable
            title="Delivery history"
            description="Recently processed emails and their delivery status."
            emails={sent}
            loading={loading}
            emptyMessage="No sent emails yet."
          />
        )}

        {view === "compose" && (
          <ComposePanel
            form={form}
            setForm={setForm}
            onSubmit={handleSchedule}
            sending={sending}
          />
        )}
      </main>
    </div>
  );
}

interface OverviewProps {
  stats: {
    label: string;
    value: number;
    icon: string;
    description: string;
  }[];
  scheduled: Email[];
  sent: Email[];
  loading: boolean;
  onCompose: () => void;
  onViewScheduled: () => void;
  onViewSent: () => void;
}

function Overview({
  stats,
  scheduled,
  sent,
  loading,
  onCompose,
  onViewScheduled,
  onViewSent,
}: OverviewProps) {
  return (
    <>
      <section className="welcome-card">
        <div className="welcome-content">
          <div className="eyebrow">EMAIL AUTOMATION</div>
          <h2>Build. Schedule. Deliver.</h2>
          <p>
            Manage your outbound email workflow from one reliable
            workspace.
          </p>

          <button className="primary-button" onClick={onCompose}>
            <span>＋</span>
            Schedule an email
          </button>
        </div>

        <div className="welcome-graphic">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="mail-graphic">
            <div className="mail-top" />
            <div className="mail-body">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-top">
              <div className="stat-icon">{stat.icon}</div>
              <span className="stat-label">{stat.label}</span>
            </div>

            <div className="stat-value">
              {loading ? "—" : stat.value}
            </div>

            <div className="stat-description">
              {stat.description}
            </div>
          </div>
        ))}
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Upcoming delivery</h3>
              <p>Next emails in your queue</p>
            </div>

            <button className="text-button" onClick={onViewScheduled}>
              View all →
            </button>
          </div>

          {loading ? (
            <LoadingRows />
          ) : scheduled.length === 0 ? (
            <EmptyState
              icon="◷"
              title="Queue is clear"
              description="There are no scheduled emails waiting."
            />
          ) : (
            <div className="email-list">
              {scheduled.slice(0, 5).map((email) => (
                <EmailRow key={email.id} email={email} />
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Recent activity</h3>
              <p>Latest email events</p>
            </div>

            <button className="text-button" onClick={onViewSent}>
              View all →
            </button>
          </div>

          {loading ? (
            <LoadingRows />
          ) : sent.length === 0 ? (
            <EmptyState
              icon="✓"
              title="No activity yet"
              description="Your email activity will appear here."
            />
          ) : (
            <div className="email-list">
              {sent.slice(0, 5).map((email) => (
                <EmailRow key={email.id} email={email} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function EmailTable({
  title,
  description,
  emails,
  loading,
  emptyMessage,
}: {
  title: string;
  description: string;
  emails: Email[];
  loading: boolean;
  emptyMessage: string;
}) {
  return (
    <section className="table-panel">
      <div className="panel-header table-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <div className="table-total">
          {emails.length} {emails.length === 1 ? "email" : "emails"}
        </div>
      </div>

      {loading ? (
        <LoadingRows />
      ) : emails.length === 0 ? (
        <EmptyState
          icon="✉"
          title={emptyMessage}
          description="Once activity is available, it will appear here."
        />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Scheduled / Sent</th>
              </tr>
            </thead>

            <tbody>
              {emails.map((email) => (
                <tr key={email.id}>
                  <td>
                    <div className="recipient-cell">
                      <div className="mini-avatar">
                        {email.to.charAt(0).toUpperCase()}
                      </div>
                      <span>{email.to}</span>
                    </div>
                  </td>

                  <td>
                    <span className="subject-cell">
                      {email.subject}
                    </span>
                  </td>

                  <td>
                    <StatusBadge status={email.status} />
                  </td>

                  <td className="date-cell">
                    {formatDate(
                      email.scheduledAt ?? email.sentAt ?? email.createdAt,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ComposePanel({
  form,
  setForm,
  onSubmit,
  sending,
}: {
  form: {
    to: string;
    from: string;
    subject: string;
    body: string;
    scheduledAt: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      to: string;
      from: string;
      subject: string;
      body: string;
      scheduledAt: string;
    }>
  >;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  sending: boolean;
}) {
  return (
    <section className="compose-layout">
      <div className="compose-panel">
        <div className="compose-header">
          <div>
            <div className="eyebrow">NEW DELIVERY</div>
            <h2>Schedule an email</h2>
            <p>
              Create a message and add it to the delivery queue.
            </p>
          </div>

          <div className="compose-symbol">✉</div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-row">
            <label>
              From
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={form.from}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    from: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              Recipient
              <input
                type="email"
                required
                placeholder="recipient@example.com"
                value={form.to}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    to: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <label>
            Subject
            <input
              type="text"
              required
              maxLength={500}
              placeholder="Enter your email subject"
              value={form.subject}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  subject: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Message
            <textarea
              required
              placeholder="Write your message..."
              rows={10}
              value={form.body}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  body: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Schedule time
            <input
              type="datetime-local"
              required
              value={form.scheduledAt}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  scheduledAt: event.target.value,
                }))
              }
            />
          </label>

          <div className="form-footer">
            <div className="delivery-info">
              <span className="status-dot" />
              Message will be processed by BullMQ
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={sending}
            >
              {sending ? "Scheduling..." : "Schedule email"}
            </button>
          </div>
        </form>
      </div>

      <aside className="compose-sidebar">
        <div className="tips-card">
          <div className="tips-icon">✦</div>
          <h3>Reliable delivery</h3>
          <p>
            Your scheduled message is persisted before being added
            to the queue.
          </p>
        </div>

        <div className="tips-card">
          <div className="tips-icon">◷</div>
          <h3>Precise scheduling</h3>
          <p>
            Emails are placed into the BullMQ queue using their
            calculated delivery time.
          </p>
        </div>

        <div className="tips-card">
          <div className="tips-icon">↗</div>
          <h3>Track everything</h3>
          <p>
            Delivery status and email events are stored for later
            inspection.
          </p>
        </div>
      </aside>
    </section>
  );
}

function EmailRow({ email }: { email: Email }) {
  return (
    <div className="email-row">
      <div className="mini-avatar">
        {email.to.charAt(0).toUpperCase()}
      </div>

      <div className="email-main">
        <strong>{email.to}</strong>
        <span>{email.subject}</span>
      </div>

      <div className="email-meta">
        <StatusBadge status={email.status} />
        <span>
          {formatDate(
            email.scheduledAt ?? email.sentAt ?? email.createdAt,
          )}
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: EmailStatus }) {
  const labels: Record<EmailStatus, string> = {
    SCHEDULED: "Scheduled",
    PROCESSING: "Processing",
    SENT: "Sent",
    FAILED: "Failed",
  };

  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      <span />
      {labels[status]}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="loading-rows">
      <div />
      <div />
      <div />
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default App;











