
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getApplications } from "../services/applicationService";
import { getGoal, updateGoal } from "../services/goalService";
import { getCreatedDate, getWeekStart } from "../utils/dates";

const STATUSES = [
  "Wishlist",
  "Applied",
  "Assessment",
  "Interview",
  "Offer",
  "Rejected",
];

const COLORS = {
  Wishlist: "#8a8f98",
  Applied: "#3b6fd4",
  Assessment: "#7c5cc4",
  Interview: "#c9811a",
  Offer: "#1f8a5b",
  Rejected: "#c8453b",
};

const cardStyle = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "16px",
  padding: "22px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.03)",
};

const headingStyle = {
  margin: "0 0 6px",
  color: "var(--ink)",
  fontSize: "18px",
};

const mutedStyle = {
  color: "var(--muted)",
  fontSize: "13px",
  margin: 0,
};

function formatShortDate(date) {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function Analytics() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [weeklyTarget, setWeeklyTarget] = useState("10");
  const [goalLoading, setGoalLoading] = useState(true);
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalError, setGoalError] = useState("");
  const [goalMessage, setGoalMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadApplications() {
      try {
        setLoading(true);
        setError("");

        const response = await getApplications();

        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.applications)
            ? response.applications
            : [];

        if (!cancelled) {
          setApplications(list);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load application analytics.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadApplications();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGoal() {
      try {
        setGoalLoading(true);
        setGoalError("");

        const goal = await getGoal();

        if (!cancelled) {
          setWeeklyTarget(
            String(goal?.weeklyApplicationTarget ?? 10)
          );
        }
      } catch (err) {
        if (!cancelled) {
          setGoalError(
            err.message || "Could not load your weekly goal."
          );
        }
      } finally {
        if (!cancelled) {
          setGoalLoading(false);
        }
      }
    }

    loadGoal();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveGoal = async (event) => {
    event.preventDefault();

    const target = Number(weeklyTarget);

    if (
      weeklyTarget.trim() === "" ||
      !Number.isInteger(target) ||
      target < 1 ||
      target > 100
    ) {
      setGoalError("Enter a whole number between 1 and 100.");
      setGoalMessage("");
      return;
    }

    try {
      setGoalSaving(true);
      setGoalError("");
      setGoalMessage("");

      const savedGoal = await updateGoal(target);

      setWeeklyTarget(
        String(savedGoal?.weeklyApplicationTarget ?? target)
      );

      setGoalMessage("Your weekly goal has been saved!");
    } catch (err) {
      setGoalError(err.message || "Could not save your weekly goal.");
    } finally {
      setGoalSaving(false);
    }
  };

  const goalStats = useMemo(() => {
    const now = new Date();
    const weekStart = getWeekStart(now);
    const nextWeekStart = new Date(weekStart);

    nextWeekStart.setDate(nextWeekStart.getDate() + 7);

    const count = applications.filter((application) => {
      const created = getCreatedDate(application);

      return (
        created &&
        created >= weekStart &&
        created < nextWeekStart
      );
    }).length;

    const target = Number(weeklyTarget);
    const validTarget =
      Number.isInteger(target) && target >= 1 && target <= 100
        ? target
        : 10;

    return {
      count,
      target: validTarget,
      remaining: Math.max(0, validTarget - count),
      progress: Math.min(
        100,
        Math.round((count / validTarget) * 100)
      ),
      weekLabel: `${formatShortDate(weekStart)} – ${formatShortDate(
        new Date(nextWeekStart.getTime() - 1)
      )}`,
    };
  }, [applications, weeklyTarget]);

  const stats = useMemo(() => {
    const total = applications.length;

    const counts = Object.fromEntries(
      STATUSES.map((status) => [
        status,
        applications.filter((app) => app.status === status).length,
      ])
    );

    const activeApplications = applications.filter(
      (app) => app.status !== "Wishlist" &&
        app.status !== "Rejected"
    ).length;

    const interviews = counts.Interview;
    const offers = counts.Offer;
    const rejected = counts.Rejected;
    const assessments = counts.Assessment;

    const interviewRate =
      activeApplications > 0
        ? Math.round((interviews / activeApplications) * 100)
        : 0;

    const offerRate =
      activeApplications > 0
        ? Math.round((offers / activeApplications) * 100)
        : 0;

    const responseRate =
      activeApplications > 0
        ? Math.round(
          ((interviews + assessments + offers + rejected) /
            activeApplications) *
          100
        )
        : 0;

    const now = new Date();

    const weeklyActivity = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = applications.filter((app) => {
        const created = getCreatedDate(app);
        return created && created >= date && created < nextDate;
      }).length;

      return {
        label: date.toLocaleDateString("en-IN", {
          weekday: "short",
        }),
        dateLabel: date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        }),
        count,
      };
    });

    const maxDaily = Math.max(
      1,
      ...weeklyActivity.map((day) => day.count)
    );

    return {
      total,
      counts,
      activeApplications,
      interviews,
      offers,
      rejected,
      assessments,
      interviewRate,
      offerRate,
      responseRate,
      weeklyActivity,
      maxDaily,
    };
  }, [applications]);

  if (loading) {
    return (
      <main style={{ padding: "32px 24px", color: "var(--muted)" }}>
        Loading your career analytics...
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: "32px 24px" }}>
        <div style={cardStyle}>
          <h2 style={headingStyle}>Unable to load analytics</h2>
          <p style={mutedStyle}>{error}</p>
          <p style={{ marginBottom: 0 }}>
            <Link to="/applications">Open Applications</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "32px 24px 48px",
        color: "var(--ink)",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div>
          <p
            style={{
              color: "var(--accent)",
              fontWeight: "700",
              fontSize: "12px",
              letterSpacing: "1.5px",
              margin: "0 0 8px",
            }}
          >
            YOUR JOB SEARCH, DECODED
          </p>

          <h1
            style={{
              fontSize: "clamp(26px, 4vw, 34px)",
              margin: "0 0 8px",
            }}
          >
            Career Analytics
          </h1>

          <p style={{ color: "var(--muted)", margin: 0 }}>
            Understand your progress and make your next move count.
          </p>
        </div>

        <Link
          to="/applications"
          style={{
            textDecoration: "none",
            background: "var(--accent)",
            color: "var(--surface)",
            padding: "12px 18px",
            borderRadius: "10px",
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          + Add application
        </Link>
      </header>

      {/* Weekly application goal */}
      <section
        style={{
          ...cardStyle,
          marginBottom: "24px",
          background: "var(--surface)",
          borderColor: "var(--line)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div style={{ flex: "1 1 250px" }}>
            <p
              style={{
                color: "var(--accent)",
                fontSize: "12px",
                fontWeight: "800",
                letterSpacing: "1.3px",
                margin: "0 0 8px",
              }}
            >
              YOUR WEEKLY MISSION
            </p>

            <h2
              style={{
                ...headingStyle,
                fontSize: "22px",
                marginBottom: "8px",
              }}
            >
              Small steps, stronger applications.
            </h2>

            <p style={mutedStyle}>
              Week of {goalStats.weekLabel}. Your progress resets every
              Monday.
            </p>
          </div>

          <form
            onSubmit={handleSaveGoal}
            style={{
              display: "flex",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <label
              style={{
                display: "grid",
                gap: "7px",
                color: "var(--ink-2)",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              Weekly target (1–100)
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                value={weeklyTarget}
                onChange={(event) => {
                  setWeeklyTarget(event.target.value);
                  setGoalMessage("");
                  setGoalError("");
                }}
                disabled={goalLoading || goalSaving}
                required
                style={{
                  width: "145px",
                  boxSizing: "border-box",
                  padding: "11px 12px",
                  border: "1px solid var(--line-strong)",
                  borderRadius: "9px",
                  color: "var(--ink)",

                  outlineColor: "var(--accent)",
                  fontSize: "15px",
                  background: "var(--surface)",
                }}
              />
            </label>

            <button
              type="submit"
              disabled={goalLoading || goalSaving}
              style={{
                padding: "12px 17px",
                border: "none",
                borderRadius: "9px",
                background:
                  goalLoading || goalSaving ? "var(--muted)" : "var(--accent)",
                color: "var(--surface)",
                fontWeight: "700",
                cursor:
                  goalLoading || goalSaving ? "not-allowed" : "pointer",
              }}
            >
              {goalLoading
                ? "Loading..."
                : goalSaving
                  ? "Saving..."
                  : "Save goal"}
            </button>
          </form>
        </div>

        <div style={{ marginTop: "28px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "10px",
            }}
          >
            <p style={{ margin: 0, fontSize: "14px", color: "var(--ink-2)" }}>
              <strong>{goalStats.count}</strong> of{" "}
              <strong>{goalStats.target}</strong> applications created this week

            </p>

            <strong style={{ color: "var(--accent)", fontSize: "14px" }}>
              {goalStats.progress}% complete
            </strong>
          </div>

          <div
            role="progressbar"
            aria-label="Weekly application goal progress"
            aria-valuemin={0}
            aria-valuemax={goalStats.target}
            aria-valuenow={Math.min(
              goalStats.count,
              goalStats.target
            )}
            style={{
              height: "12px",
              background: "var(--line)",
              borderRadius: "20px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${goalStats.progress}%`,
                height: "100%",
                background: "var(--accent)",
                borderRadius: "20px",
                transition: "width 0.3s ease",
              }}
            />
          </div>

          <p
            style={{
              margin: "12px 0 0",
              color: "var(--ink-2)",
              fontSize: "13px",
            }}
          >
            {goalStats.remaining === 0
              ? "Goal achieved! You hit your weekly target."
              : `${goalStats.remaining} more ${goalStats.remaining === 1 ? "application" : "applications"
              } to reach your weekly goal. Keep going!`}
          </p>
        </div>

        {goalError && (
          <p
            role="alert"
            style={{
              margin: "14px 0 0",
              color: "var(--danger)",
              fontSize: "13px",
            }}
          >
            {goalError}
          </p>
        )}

        {goalMessage && (
          <p
            role="status"
            style={{
              margin: "14px 0 0",
              color: "var(--ok)",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            {goalMessage}
          </p>
        )}
      </section>

      {applications.length === 0 ? (
        <section
          style={{
            ...cardStyle,
            textAlign: "center",
            padding: "42px 24px",
          }}
        >
          <h2 style={headingStyle}>
            Your story starts with one application
          </h2>
          <p style={{ ...mutedStyle, marginBottom: "20px" }}>
            Add an application to see your job-search analytics here.
            Your weekly goal is ready whenever you are.
          </p>
          <Link
            to="/applications"
            style={{ color: "var(--accent)", fontWeight: "700" }}
          >
            Go to Applications
          </Link>
        </section>
      ) : (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            {[
              {
                label: "Total tracked",
                value: stats.total,
                detail: "All saved opportunities",
                color: "var(--accent)",
              },
              {
                label: "Active applications",
                value: stats.activeApplications,
                detail: "Excludes Wishlist",
                color: "var(--accent)",
              },
              {
                label: "Interviews",
                value: stats.interviews,
                detail: `${stats.interviewRate}% of active applications`,
                color: "#3b6fd4",
              },
              {
                label: "Offers",
                value: stats.offers,
                detail: `${stats.offerRate}% of active applications`,
                color: "#1f8a5b",
              },
            ].map((item) => (
              <article
                key={item.label}
                style={{
                  ...cardStyle,
                  borderTop: `4px solid ${item.color}`,
                }}
              >
                <p style={mutedStyle}>{item.label}</p>
                <p
                  style={{
                    fontSize: "32px",
                    fontWeight: "800",
                    margin: "12px 0 6px",
                    color: item.color,
                  }}
                >
                  {item.value}
                </p>
                <p style={mutedStyle}>{item.detail}</p>
              </article>
            ))}
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
              gap: "20px",
              marginBottom: "24px",
            }}
          >
            <article style={cardStyle}>
              <h2 style={headingStyle}>Application pipeline</h2>
              <p style={{ ...mutedStyle, marginBottom: "22px" }}>
                Where your opportunities currently stand.
              </p>

              <div
                style={{
                  display: "flex",
                  height: "12px",
                  borderRadius: "20px",
                  overflow: "hidden",
                  background: "var(--surface-2)",
                  marginBottom: "24px",
                }}
              >
                {STATUSES.map((status) =>
                  stats.counts[status] > 0 ? (
                    <div
                      key={status}
                      title={`${status}: ${stats.counts[status]}`}
                      style={{
                        width: `${(stats.counts[status] / stats.total) * 100
                          }%`,
                        background: COLORS[status],
                      }}
                    />
                  ) : null
                )}
              </div>

              <div style={{ display: "grid", gap: "15px" }}>
                {STATUSES.map((status) => (
                  <div
                    key={status}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "12px 1fr auto",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: COLORS[status],
                      }}
                    />
                    <span style={{ fontSize: "14px" }}>{status}</span>
                    <strong style={{ fontSize: "14px" }}>
                      {stats.counts[status]}
                    </strong>
                  </div>
                ))}
              </div>
            </article>

            <article style={cardStyle}>
              <h2 style={headingStyle}>Your last 7 days</h2>
              <p style={{ ...mutedStyle, marginBottom: "22px" }}>
                Applications created each day.
              </p>

              <div
                style={{
                  height: "190px",
                  display: "flex",
                  alignItems: "end",
                  gap: "clamp(5px, 2vw, 14px)",
                  paddingTop: "12px",
                }}
              >
                {stats.weeklyActivity.map((day) => (
                  <div
                    key={day.dateLabel}
                    title={`${day.dateLabel}: ${day.count} applications`}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "end",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--ink-2)",
                        fontWeight: "600",
                      }}
                    >
                      {day.count}
                    </span>

                    <div
                      style={{
                        width: "min(100%, 34px)",
                        minHeight: "4px",
                        height: `${Math.max(
                          4,
                          (day.count / stats.maxDaily) * 125
                        )}px`,
                        borderRadius: "7px 7px 3px 3px",
                        background: "var(--accent)",
                        transition: "height 0.2s ease",
                      }}
                    />

                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                      {day.label}
                    </span>
                  </div>
                ))}
              </div>

              <p style={{ ...mutedStyle, marginTop: "18px" }}>
                Based on application creation dates, not status changes.
              </p>
            </article>
          </section>

          <section style={{ ...cardStyle, marginBottom: "24px" }}>
            <h2 style={headingStyle}>Conversion snapshot</h2>
            <p style={{ ...mutedStyle, marginBottom: "22px" }}>
              A quick look at how your tracked applications are progressing.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "24px",
              }}
            >
              {[
                {
                  label: "Assessment stage",
                  value: stats.assessments,
                  description: "Applications at assessment",
                  color: COLORS.Assessment,
                },
                {
                  label: "Interview rate",
                  value: `${stats.interviewRate}%`,
                  description: "Interviews ÷ active applications",
                  color: COLORS.Interview,
                },
                {
                  label: "Offer rate",
                  value: `${stats.offerRate}%`,
                  description: "Offers ÷ active applications",
                  color: COLORS.Offer,
                },
                {
                  label: "Rejected",
                  value: stats.rejected,
                  description: "Opportunities marked rejected",
                  color: COLORS.Rejected,
                },
              ].map((item) => (
                <div key={item.label}>
                  <p style={mutedStyle}>{item.label}</p>
                  <p
                    style={{
                      fontSize: "27px",
                      fontWeight: "800",
                      color: item.color,
                      margin: "10px 0 5px",
                    }}
                  >
                    {item.value}
                  </p>
                  <p style={mutedStyle}>{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={headingStyle}>Your next move</h2>
            <p style={{ ...mutedStyle, marginBottom: "18px" }}>
              Turn your tracking data into action.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
              }}
            >
              <div
                style={{
                  padding: "16px",
                  background: "var(--surface-2)",
                  borderRadius: "12px",
                }}
              >
                <strong>Keep your pipeline fresh</strong>
                <p style={{ ...mutedStyle, margin: "8px 0 0" }}>
                  Update application statuses as you hear back from companies.
                </p>
              </div>

              <div
                style={{
                  padding: "16px",
                  background: "var(--surface-2)",
                  borderRadius: "12px",
                }}
              >
                <strong>Prepare for interviews</strong>
                <p style={{ ...mutedStyle, margin: "8px 0 0" }}>
                  Practice questions and review topics for upcoming interviews.
                </p>
              </div>

              <div
                style={{
                  padding: "16px",
                  background: "var(--ok-soft)",
                  borderRadius: "12px",
                }}
              >
                <strong>Build a consistent routine</strong>
                <p style={{ ...mutedStyle, margin: "8px 0 0" }}>
                  Your weekly target keeps your job search focused and measurable.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
export default Analytics;
