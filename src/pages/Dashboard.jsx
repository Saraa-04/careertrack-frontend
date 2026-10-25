import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApplications } from "../services/applicationService";
import { getPreparation } from "../services/interviewPreparationService";
import { getGoal, updateGoal } from "../services/goalService";
import {
  getDeadlineDate,
  getDayStart,
  getCreatedDate,
  getWeekStart,
} from "../utils/dates";

const cardStyle = {
  padding: 22,
  border: "1px solid var(--line)",
  borderRadius: 16,
  backgroundColor: "var(--surface)",
  boxShadow: "0 3px 12px rgba(0,0,0,0.04)",
};

const statusColors = {
  Wishlist: "#8a8f98",
  Applied: "#3b6fd4",
  Assessment: "#7c5cc4",
  Interview: "#c9811a",
  Offer: "#1f8a5b",
  Rejected: "#c8453b",
};

const buttonStyle = {
  display: "inline-block",
  padding: "10px 15px",
  borderRadius: 9,
  backgroundColor: "var(--accent)",
  color: "var(--surface)",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: 14,
};

function Dashboard() {
  const [applications, setApplications] = useState([]);
  const [preparations, setPreparations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [weeklyTarget, setWeeklyTarget] = useState(10);
  const [targetInput, setTargetInput] = useState("10");
  const [goalLoading, setGoalLoading] = useState(true);
  const [goalError, setGoalError] = useState("");
  const [goalMessage, setGoalMessage] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);

  const [showAllPrep, setShowAllPrep] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const response = await getApplications();

        const applicationList = Array.isArray(response)
          ? response
          : Array.isArray(response?.applications)
            ? response.applications
            : [];

        if (cancelled) return;

        setApplications(applicationList);

        const results = await Promise.all(
          applicationList.map(async (app) => {
            const emptyPreparation = {
              applicationId: app._id,
              company: app.company,
              role: app.role,
              status: app.status,
              questions: [],
              revisionTopics: [],
              interviewDate: null,
              interviewType: null,
              hasWorkspace: false,
            };

            try {
              const data = await getPreparation(app._id);
              const prep = data?.preparation;

              if (!prep) return emptyPreparation;

              return {
                ...emptyPreparation,
                questions: Array.isArray(prep.questions)
                  ? prep.questions
                  : [],
                revisionTopics: Array.isArray(prep.revisionTopics)
                  ? prep.revisionTopics
                  : [],
                interviewDate: prep.interviewDate || null,
                interviewType: prep.interviewType || "Technical",
                hasWorkspace: true,
              };
            } catch {
              return emptyPreparation;
            }
          })
        );

        if (!cancelled) {
          setPreparations(results);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load dashboard data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load the same saved goal used by the Analytics page.
  useEffect(() => {
    let cancelled = false;

    async function loadWeeklyGoal() {
      try {
        setGoalLoading(true);
        setGoalError("");

        const goal = await getGoal();
        const target = Number(goal?.weeklyApplicationTarget);

        const validTarget =
          Number.isInteger(target) && target >= 1 && target <= 100
            ? target
            : 10;

        if (!cancelled) {
          setWeeklyTarget(validTarget);
          setTargetInput(String(validTarget));
        }
      } catch (err) {
        if (!cancelled) {
          setGoalError(err.message || "Could not load your weekly goal.");
        }
      } finally {
        if (!cancelled) {
          setGoalLoading(false);
        }
      }
    }

    loadWeeklyGoal();

    return () => {
      cancelled = true;
    };
  }, []);

  // Validate and save a new weekly target.
  const handleSaveGoal = async () => {
    const target = Number(targetInput);

    if (
      targetInput.trim() === "" ||
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

      const updatedGoal = await updateGoal(target);
      const returnedTarget = Number(updatedGoal?.weeklyApplicationTarget);

      // Fall back to the value we sent if the service returns another shape.
      const savedTarget = Number.isInteger(returnedTarget)
        ? returnedTarget
        : target;

      setWeeklyTarget(savedTarget);
      setTargetInput(String(savedTarget));
      setGoalMessage("Your weekly goal has been saved!");
    } catch (err) {
      setGoalError(err.message || "Could not save your weekly goal.");
    } finally {
      setGoalSaving(false);
    }
  };

  if (loading) {
    return (
      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "36px 20px",
          color: "var(--muted)",
        }}
      >
        Loading your CareerTrack dashboard...
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 20px" }}>
        <h2>Couldn't load your dashboard</h2>
        <p style={{ color: "var(--danger)" }}>{error}</p>
        <Link to="/applications">View Applications</Link>
      </main>
    );
  }

  const today = getDayStart(new Date());

  const nextSevenDays = new Date(today);
  nextSevenDays.setDate(nextSevenDays.getDate() + 7);
  nextSevenDays.setHours(23, 59, 59, 999);

  // Weekly goal: count applications created Monday through Sunday.
  const weekStart = getWeekStart(new Date());
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  const weeklyApplications = applications.filter((app) => {
    const created = getCreatedDate(app);
    return created && created >= weekStart && created < nextWeekStart;
  }).length;

  const safeTarget =
    Number.isInteger(weeklyTarget) && weeklyTarget >= 1 && weeklyTarget <= 100
      ? weeklyTarget
      : 10;

  const weeklyProgress = Math.min(
    100,
    Math.round((weeklyApplications / safeTarget) * 100)
  );

  const remainingApplications = Math.max(
    0,
    safeTarget - weeklyApplications
  );

  const countStatus = (status) =>
    applications.filter((app) => app.status === status).length;

  const totalApplications = applications.length;
  const wishlist = countStatus("Wishlist");
  const applied = countStatus("Applied");
  const assessments = countStatus("Assessment");
  const interviews = countStatus("Interview");
  const offers = countStatus("Offer");
  const rejected = countStatus("Rejected");

  // Interview question progress.
  const totalQuestions = preparations.reduce(
    (sum, item) => sum + item.questions.length,
    0
  );

  const practicedQuestions = preparations.reduce(
    (sum, item) =>
      sum + item.questions.filter((question) => question.isPracticed).length,
    0
  );

  // Revision checklist progress.
  const totalRevisionTopics = preparations.reduce(
    (sum, item) => sum + item.revisionTopics.length,
    0
  );

  const completedRevisionTopics = preparations.reduce(
    (sum, item) =>
      sum +
      item.revisionTopics.filter((topic) => topic.isCompleted).length,
    0
  );

  const totalPreparationTasks = totalQuestions + totalRevisionTopics;
  const completedPreparationTasks =
    practicedQuestions + completedRevisionTopics;

  const readinessRate = totalPreparationTasks
    ? Math.round(
        (completedPreparationTasks / totalPreparationTasks) * 100
      )
    : 0;

  const questionProgress = totalQuestions
    ? Math.round((practicedQuestions / totalQuestions) * 100)
    : 0;

  const revisionProgress = totalRevisionTopics
    ? Math.round(
        (completedRevisionTopics / totalRevisionTopics) * 100
      )
    : 0;

  // Pipeline indicator, not an employer response rate.
  const interviewOfferRate =
    totalApplications === 0
      ? 0
      : Math.round(
          ((interviews + offers) / totalApplications) * 100
        );

  // Application deadline alerts.
  // Offer and Rejected applications are finished, so their deadlines no longer
  // need attention (the Applications page treats them the same way).
  const CLOSED_STATUSES = ["Offer", "Rejected"];

  const applicationsWithDeadlines = applications
    .map((app) => ({
      ...app,
      parsedDeadline: getDeadlineDate(app.deadline),
    }))
    .filter(
      (app) =>
        app.parsedDeadline && !CLOSED_STATUSES.includes(app.status)
    );

  const overdueDeadlines = applicationsWithDeadlines
    .filter((app) => app.parsedDeadline < today)
    .sort((a, b) => a.parsedDeadline - b.parsedDeadline);

  const upcomingDeadlines = applicationsWithDeadlines
    .filter(
      (app) =>
        app.parsedDeadline >= today &&
        app.parsedDeadline <= nextSevenDays
    )
    .sort((a, b) => a.parsedDeadline - b.parsedDeadline);

  // Upcoming interviews.
  const upcomingInterviews = preparations
    .map((item) => ({
      ...item,
      parsedInterviewDate: item.interviewDate
        ? new Date(item.interviewDate)
        : null,
    }))
    .filter(
      (item) =>
        item.parsedInterviewDate &&
        !Number.isNaN(item.parsedInterviewDate.getTime()) &&
        item.parsedInterviewDate >= new Date() &&
        item.parsedInterviewDate <= nextSevenDays
    )
    .sort(
      (a, b) => a.parsedInterviewDate - b.parsedInterviewDate
    );

  // NEXT BEST ACTION
  // Picks the single most useful next step from data already on this page.
  // Priority: overdue deadline > interview within 48h > deadline this week >
  // interview this week > prep for an interview-stage role > unfinished prep >
  // weekly goal > general nudge.

  const prepTaskCount = (item) =>
    item.questions.length + item.revisionTopics.length;

  const prepCompletedCount = (item) =>
    item.questions.filter((question) => question.isPracticed).length +
    item.revisionTopics.filter((topic) => topic.isCompleted).length;

  const interviewAction = (interview, priority) => ({
    title: "Get ready for your interview",
    company: interview.company,
    role: interview.role,
    description: `Your ${interview.interviewType || "interview"} is scheduled for ${interview.parsedInterviewDate.toLocaleString()}. Review your questions and revision topics.`,
    link: `/applications/${interview.applicationId}/preparation`,
    buttonText: "Prepare for interview",
    priority,
    color: "var(--accent)",
    background: "var(--accent-soft)",
  });

  const nextBestAction = (() => {
    if (overdueDeadlines.length > 0) {
      const app = overdueDeadlines[0];
      const others = overdueDeadlines.length - 1;

      return {
        title: "Resolve an overdue deadline",
        company: app.company,
        role: app.role,
        description: `The deadline for ${app.company} was ${app.parsedDeadline.toLocaleDateString()}. Apply if you still can, or update its status.${
          others > 0
            ? ` ${others} other ${others === 1 ? "deadline is" : "deadlines are"} also overdue.`
            : ""
        }`,
        link: "/applications",
        buttonText: "Review applications",
        priority: "Urgent",
        urgent: true,
        color: "var(--danger)",
        background: "var(--danger-soft)",
      };
    }

    const imminentInterview = upcomingInterviews.find(
      (item) =>
        item.parsedInterviewDate - new Date() <= 48 * 60 * 60 * 1000
    );

    if (imminentInterview) {
      return interviewAction(imminentInterview, "Interview soon");
    }

    if (upcomingDeadlines.length > 0) {
      const app = upcomingDeadlines[0];

      return {
        title: "Prepare for an approaching deadline",
        company: app.company,
        role: app.role,
        description: `${app.company} has an application deadline on ${app.parsedDeadline.toLocaleDateString()}. Review your application and finish any outstanding preparation.`,
        link: `/applications/${app._id}/preparation`,
        buttonText: "Review preparation",
        priority: "Coming up",
        color: "var(--warn)",
        background: "var(--warn-soft)",
      };
    }

    if (upcomingInterviews.length > 0) {
      return interviewAction(upcomingInterviews[0], "This week");
    }

    const needsPrep = preparations.find(
      (item) =>
        ["Interview", "Assessment"].includes(item.status) &&
        prepTaskCount(item) === 0
    );

    if (needsPrep) {
      return {
        title: `Start preparing for ${needsPrep.status === "Assessment" ? "your assessment" : "your interview"}`,
        company: needsPrep.company,
        role: needsPrep.role,
        description: `${needsPrep.company} is at the ${needsPrep.status} stage but you haven't saved any questions or revision topics yet. Even three questions is a good start.`,
        link: `/applications/${needsPrep.applicationId}/preparation`,
        buttonText: "Open preparation",
        priority: "Get ready",
        color: "var(--accent)",
        background: "var(--accent-soft)",
      };
    }

    const unfinishedPreparation = preparations.find((item) => {
      const total = prepTaskCount(item);
      return total > 0 && prepCompletedCount(item) < total;
    });

    if (unfinishedPreparation) {
      return {
        title: "Build your interview readiness",
        company: unfinishedPreparation.company,
        role: unfinishedPreparation.role,
        description: `You still have questions or revision topics to complete for ${unfinishedPreparation.company}. A short practice session can move your preparation forward.`,
        link: `/applications/${unfinishedPreparation.applicationId}/preparation`,
        buttonText: "Continue preparing",
        priority: "Keep progressing",
        color: "var(--accent)",
        background: "var(--accent-soft)",
      };
    }

    if (applications.length === 0) {
      return {
        title: "Start building your career pipeline",
        company: "",
        role: "",
        description: "Add your first opportunity to start tracking applications, deadlines, and interview preparation in one place.",
        link: "/applications",
        buttonText: "Add your first application",
        priority: "Get started",
        color: "var(--accent)",
        background: "var(--accent-soft)",
      };
    }

    if (remainingApplications > 0) {
      return {
        title: "Keep your weekly goal on track",
        company: "",
        role: "",
        description: `${remainingApplications} more ${
          remainingApplications === 1 ? "application" : "applications"
        } to reach this week's target of ${safeTarget}.${
          wishlist > 0
            ? ` You have ${wishlist} on your wishlist ready to move forward.`
            : ""
        }`,
        link: "/applications",
        buttonText: "Open applications",
        priority: "This week",
        color: "var(--accent)",
        background: "var(--accent-soft)",
      };
    }

    return {
      title: "Keep your career momentum going",
      company: "",
      role: "",
      description: "Your urgent items are clear. Find a suitable opportunity, update an application, or add interview questions to keep moving forward.",
      link: "/applications",
      buttonText: "View applications",
      priority: "Next step",
      color: "var(--accent)",
      background: "var(--accent-soft)",
    };
  })();

  const recentApplications = [...applications]
    .sort((a, b) => {
      const dateA = new Date(
        a.updatedAt || a.createdAt || 0
      ).getTime();

      const dateB = new Date(
        b.updatedAt || b.createdAt || 0
      ).getTime();

      return dateB - dateA;
    })
    .slice(0, 5);

  const stats = [
    {
      label: "Total Applications",
      value: totalApplications,
      color: "var(--accent)",
      detail: "Your entire job search",
    },
    {
      label: "Applied",
      value: applied,
      color: "#3b6fd4",
      detail: "Applications submitted",
    },
    {
      label: "Interviews",
      value: interviews,
      color: "#c9811a",
      detail: "Interview stage",
    },
    {
      label: "Offers",
      value: offers,
      color: "#1f8a5b",
      detail: "Offers received",
    },
  ];

  const renderDeadline = (app, isOverdue = false) => (
    <article
      key={app._id}
      style={{
        padding: "12px 0",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <strong>{app.company}</strong>
          <span style={{ color: "var(--muted)" }}> · {app.role}</span>
          <p
            style={{
              margin: "4px 0 0",
              color: isOverdue ? "var(--danger)" : "var(--warn)",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {isOverdue ? "Overdue: " : "Due "}
            {app.parsedDeadline.toLocaleDateString()}
          </p>
        </div>

        <Link
          to={`/applications/${app._id}/preparation`}
          style={{
            ...buttonStyle,
            padding: "7px 12px",
            fontSize: 13,
            backgroundColor: "var(--accent-soft)",
            color: "var(--accent)",
          }}
        >
          Interview Prep
        </Link>
      </div>
    </article>
  );

  const moreLink = (count) =>
    count > 0 && (
      <Link
        to="/applications"
        style={{
          display: "inline-block",
          marginTop: 12,
          color: "var(--accent)",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        +{count} more →
      </Link>
    );

  const VISIBLE_LIST_LIMIT = 3;
  const PREP_PREVIEW_LIMIT = 6;

  // Show the companies that most need attention first.
  const prepRank = (item) =>
    (prepTaskCount(item) > 0 ? 2 : 0) +
    (["Interview", "Assessment"].includes(item.status) ? 1 : 0);

  const sortedPreparations = [...preparations].sort(
    (a, b) => prepRank(b) - prepRank(a)
  );

  const visiblePreparations = showAllPrep
    ? sortedPreparations
    : sortedPreparations.slice(0, PREP_PREVIEW_LIMIT);

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <main
      className="page-grid"
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "36px 20px 64px",
        color: "var(--ink)",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 18,
          marginBottom: 28,
        }}
      >
        <div>
          <p
            className="eyebrow"
            style={{ marginBottom: 8 }}
          >
            {todayLabel}
          </p>
          <h1 style={{ marginBottom: 8 }}>
            Your career command center
          </h1>
          <p style={{ color: "var(--muted)", margin: 0 }}>
            Track applications, prepare for interviews, and stay ahead
            of deadlines.
          </p>
        </div>

        <Link to="/applications" style={buttonStyle}>
          + Manage Applications
        </Link>
      </header>

      {/* NEXT BEST ACTION */}
      <section
        style={{
          ...cardStyle,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
          borderColor: nextBestAction.urgent
            ? "var(--danger-line)"
            : "var(--line)",
          background: nextBestAction.urgent
            ? "var(--danger-soft)"
            : "var(--surface)",
          borderLeft: `4px solid ${nextBestAction.color}`,
        }}
      >
        <div style={{ flex: "1 1 280px" }}>
          <p
            style={{
              margin: "0 0 10px",
              color: nextBestAction.color,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1.2,
            }}
          >
            YOUR NEXT BEST ACTION · {nextBestAction.priority.toUpperCase()}
          </p>

          <h2 style={{ fontSize: 22, marginBottom: 8 }}>
            {nextBestAction.title}
          </h2>

          {nextBestAction.company && (
            <p style={{ fontWeight: 600, marginBottom: 6 }}>
              {nextBestAction.company}
              {nextBestAction.role ? ` · ${nextBestAction.role}` : ""}
            </p>
          )}

          <p style={{ color: "var(--muted)", margin: 0 }}>
            {nextBestAction.description}
          </p>
        </div>

        <Link
          to={nextBestAction.link}
          style={{
            ...buttonStyle,
            backgroundColor: nextBestAction.color,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {nextBestAction.buttonText} →
        </Link>
      </section>

      {/* MAIN STATISTICS */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 16,
        }}
      >
        {stats.map((stat) => (
          <article
            key={stat.label}
            style={{ ...cardStyle, borderTop: `3px solid ${stat.color}` }}
          >
            <p style={{ color: "var(--muted)", margin: "0 0 12px" }}>
              {stat.label}
            </p>
            <h2
              style={{
                fontSize: 36,
                margin: "0 0 8px",
                color: stat.color,
              }}
            >
              {stat.value}
            </h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
              {stat.detail}
            </p>
          </article>
        ))}
      </section>

      {/* WEEKLY APPLICATION GOAL */}
      <section className="span-7" 
        style={{
          ...cardStyle,
          marginBottom: 20,
          background: "var(--surface)",
          borderColor: "var(--line)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 8px",
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1.3,
              }}
            >
              YOUR WEEKLY MISSION
            </p>
            <h2 style={{ margin: "0 0 8px" }}>
              One week. One focused goal.
            </h2>
            <p style={{ color: "var(--muted)", margin: 0, fontSize: 13 }}>
              Applications created this week, Monday through Sunday.
            </p>
          </div>

          <Link
            to="/analytics"
            style={{
              ...buttonStyle,
              backgroundColor: "var(--accent-soft)",
              color: "var(--accent)",
            }}
          >
            Manage goal →
          </Link>
        </div>

        {goalLoading ? (
          <p style={{ color: "var(--muted)", marginTop: 22 }}>
            Loading your weekly goal...
          </p>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 26,
                marginBottom: 10,
              }}
            >
              <p style={{ margin: 0, color: "var(--ink-2)", fontSize: 14 }}>
                <strong>{weeklyApplications}</strong> of{" "}
                <strong>{safeTarget}</strong> applications
              </p>
              <strong style={{ color: "var(--accent)" }}>
                {weeklyProgress}% complete
              </strong>
            </div>

            <div
              role="progressbar"
              aria-label="Weekly application goal progress"
              aria-valuemin={0}
              aria-valuemax={safeTarget}
              aria-valuenow={Math.min(weeklyApplications, safeTarget)}
              style={{
                height: 12,
                backgroundColor: "var(--line)",
                borderRadius: 20,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${weeklyProgress}%`,
                  height: "100%",
                  background: "var(--accent)",
                  borderRadius: 20,
                  transition: "width 0.3s ease",
                }}
              />
            </div>

            <p style={{ color: "var(--ink-2)", fontSize: 13, marginBottom: 0 }}>
              {remainingApplications === 0
                ? "Weekly target achieved! Fantastic progress."
                : `${remainingApplications} more ${
                    remainingApplications === 1
                      ? "application"
                      : "applications"
                  } to reach your target.`}
            </p>

            {/* Edit the weekly target */}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
                marginTop: 20,
              }}
            >
              <label
                htmlFor="weeklyTarget"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                Weekly target
              </label>

              <input
                id="weeklyTarget"
                type="number"
                min="1"
                max="100"
                step="1"
                value={targetInput}
                onChange={(event) => {
                  setTargetInput(event.target.value);
                  setGoalError("");
                  setGoalMessage("");
                }}
                disabled={goalSaving}
                style={{
                  width: 100,
                  padding: "10px 12px",
                  border: "1px solid var(--line-strong)",
                  borderRadius: 9,
                  fontSize: 14,
                }}
              />

              <button
                type="button"
                onClick={handleSaveGoal}
                disabled={goalSaving || goalLoading}
                style={{
                  ...buttonStyle,
                  border: "none",
                  cursor: goalSaving || goalLoading ? "wait" : "pointer",
                  opacity: goalSaving || goalLoading ? 0.7 : 1,
                }}
              >
                {goalSaving ? "Saving..." : "Save target"}
              </button>
            </div>

            {goalMessage && (
              <p role="status" style={{ color: "var(--ok)", fontSize: 13 }}>
                {goalMessage}
              </p>
            )}
          </>
        )}

        {goalError && (
          <p role="alert" style={{ color: "var(--danger)", fontSize: 13 }}>
            {goalError} You can manage your goal in Analytics.
          </p>
        )}
      </section>

      {/* INTERVIEW AND OFFER PROGRESS */}
      <section className="span-5"
        style={{
          ...cardStyle,
          marginTop: 20,
          backgroundColor: "var(--surface-2)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Interview and offer progress</h2>
        <p style={{ color: "var(--muted)" }}>
          Percentage of all tracked applications currently at the Interview
          or Offer stage. This is a pipeline indicator, not an employer response rate.
        </p>

        <div
          style={{
            height: 12,
            backgroundColor: "var(--line)",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${interviewOfferRate}%`,
              backgroundColor: "var(--accent)",
              borderRadius: 20,
              transition: "width 0.3s ease",
            }}
          />
        </div>

        <p style={{ fontWeight: 700 }}>
          {interviewOfferRate}% of applications are at Interview or Offer
        </p>
      </section>

      {/* APPLICATION PIPELINE */}
      <section className="span-5" style={{ ...cardStyle, marginTop: 20 }}>
        <h2 style={{ marginTop: 0 }}>Application pipeline</h2>
        <p style={{ color: "var(--muted)" }}>
          See where your applications currently stand.
        </p>

        {Object.entries(statusColors).map(([status, color]) => {
          const count = countStatus(status);
          const percentage =
            totalApplications === 0
              ? 0
              : (count / totalApplications) * 100;

          return (
            <div key={status} style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 7,
                }}
              >
                <span>{status}</span>
                <strong>{count}</strong>
              </div>

              <div
                style={{
                  height: 9,
                  backgroundColor: "var(--surface-2)",
                  borderRadius: 20,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${percentage}%`,
                    height: "100%",
                    backgroundColor: color,
                    borderRadius: 20,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </section>

      {/* RECENT APPLICATIONS */}
      <section className="span-7" style={{ ...cardStyle, marginTop: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Recent applications</h2>
          <Link to="/applications" style={{ color: "var(--accent)" }}>
            View all →
          </Link>
        </div>

        {recentApplications.length === 0 ? (
          <div style={{ padding: "15px 0" }}>
            <p style={{ color: "var(--muted)" }}>
              Your job search starts here. Add your first application to see your progress.
            </p>
            <Link to="/applications" style={buttonStyle}>
              Add an application
            </Link>
          </div>
        ) : (
          recentApplications.map((app) => (
            <article
              key={app._id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                padding: "15px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div>
                <strong>{app.company}</strong>
                <p style={{ margin: "5px 0", color: "var(--muted)" }}>
                  {app.role}
                </p>
              </div>

              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 20,
                  backgroundColor: `${
                    statusColors[app.status] || "var(--muted)"
                  }18`,
                  color: statusColors[app.status] || "var(--muted)",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {app.status}
              </span>
            </article>
          ))
        )}
      </section>
      {/* DEADLINE ALERTS */}
      <section className="span-6" 
        style={{
          ...cardStyle,
          marginTop: 20,
          borderColor: overdueDeadlines.length > 0 ? "var(--danger-line)" : "var(--line)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Deadline alerts</h2>
        <p style={{ color: "var(--muted)" }}>
          Keep an eye on approaching application deadlines.
        </p>

        {overdueDeadlines.length === 0 &&
          upcomingDeadlines.length === 0 && (
            <p style={{ color: "var(--muted)" }}>
              No overdue deadlines or deadlines due in the next seven days.
              Add a deadline to an application to see an alert here.
            </p>
          )}

        {overdueDeadlines.length > 0 && (
          <>
            <h3 style={{ color: "var(--danger)" }}>
              Overdue ({overdueDeadlines.length})
            </h3>
            {overdueDeadlines
              .slice(0, VISIBLE_LIST_LIMIT)
              .map((app) => renderDeadline(app, true))}
            {moreLink(overdueDeadlines.length - VISIBLE_LIST_LIMIT)}
          </>
        )}

        {upcomingDeadlines.length > 0 && (
          <>
            <h3 style={{ color: "var(--warn)" }}>
              Due within 7 days ({upcomingDeadlines.length})
            </h3>
            {upcomingDeadlines
              .slice(0, VISIBLE_LIST_LIMIT)
              .map((app) => renderDeadline(app))}
            {moreLink(upcomingDeadlines.length - VISIBLE_LIST_LIMIT)}
          </>
        )}
      </section>

      {/* UPCOMING INTERVIEWS */}
      <section className="span-6" style={{ ...cardStyle, marginTop: 20 }}>
        <h2 style={{ marginTop: 0 }}>Upcoming interviews</h2>
        <p style={{ color: "var(--muted)" }}>
          Interviews scheduled in your preparation workspaces over the next seven days.
        </p>

        {upcomingInterviews.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>
            No interviews scheduled for the next seven days. Add an interview
            date in Interview Prep and it will appear here.
          </p>
        ) : (
          upcomingInterviews.slice(0, VISIBLE_LIST_LIMIT).map((item) => (
            <article
              key={item.applicationId}
              style={{
                padding: "12px 0",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <strong>{item.company}</strong>
                <span style={{ color: "var(--muted)" }}> · {item.role}</span>
                <p
                  style={{
                    margin: "4px 0 0",
                    color: "var(--warn)",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {item.parsedInterviewDate.toLocaleString()} ·{" "}
                  {item.interviewType || "Interview"}
                </p>
              </div>

              <Link
                to={`/applications/${item.applicationId}/preparation`}
                style={{ ...buttonStyle, padding: "7px 12px", fontSize: 13 }}
              >
                Review Preparation
              </Link>
            </article>
          ))
        )}
      </section>

      {/* QUICK OVERVIEW */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 20,
        }}
      >
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Still on your wishlist</h3>
          <p style={{ color: "var(--muted)", fontSize: 30, fontWeight: 700 }}>
            {wishlist}
          </p>
          <Link to="/applications" style={{ color: "var(--accent)" }}>
            Review opportunities →
          </Link>
        </article>

        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Assessments</h3>
          <p style={{ color: "#7c5cc4", fontSize: 30, fontWeight: 700 }}>
            {assessments}
          </p>
          <Link to="/applications" style={{ color: "var(--accent)" }}>
            Check applications →
          </Link>
        </article>

        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Rejected</h3>
          <p style={{ color: "#c8453b", fontSize: 30, fontWeight: 700 }}>
            {rejected}
          </p>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            Every application is experience for the next one.
          </p>
        </article>
      </section>

      {/* INTERVIEW READINESS */}
      <section
        style={{
          ...cardStyle,
          marginBottom: 20,
          backgroundColor: "var(--surface-2)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Interview readiness</h2>

        <p style={{ color: "var(--muted)" }}>
          Track practiced questions and completed revision topics across
          your saved preparation workspaces.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 14,
            margin: "22px 0",
          }}
        >
          <div style={{ padding: 16, borderRadius: 12, backgroundColor: "var(--surface)" }}>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
              Readiness progress
            </p>
            <h2 style={{ color: "var(--accent)", fontSize: 30, margin: "8px 0" }}>
              {readinessRate}%
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
              {completedPreparationTasks} of {totalPreparationTasks} tasks completed
            </p>
          </div>

          <div style={{ padding: 16, borderRadius: 12, backgroundColor: "var(--surface)" }}>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
              Questions practiced
            </p>
            <h2 style={{ color: "var(--accent)", fontSize: 30, margin: "8px 0" }}>
              {practicedQuestions}/{totalQuestions}
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
              {questionProgress}% of saved questions
            </p>
          </div>

          <div style={{ padding: 16, borderRadius: 12, backgroundColor: "var(--surface)" }}>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
              Revision completed
            </p>
            <h2 style={{ color: "var(--gold)", fontSize: 30, margin: "8px 0" }}>
              {completedRevisionTopics}/{totalRevisionTopics}
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
              {revisionProgress}% of saved topics
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          <strong>Overall preparation progress</strong>
          <strong>{readinessRate}%</strong>
        </div>

        <div
          role="progressbar"
          aria-label="Overall interview preparation progress"
          aria-valuenow={readinessRate}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            height: 12,
            backgroundColor: "var(--line)",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${readinessRate}%`,
              height: "100%",
              backgroundColor: "var(--accent)",
              borderRadius: 20,
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {totalPreparationTasks === 0 && (
          <p style={{ color: "var(--muted)", marginTop: 14 }}>
            Your preparation journey starts here. Add interview questions
            or revision topics to begin tracking your progress.
          </p>
        )}

        <h3 style={{ marginTop: 26 }}>Preparation by company</h3>

        {preparations.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>
            Add an application to start building your preparation plan.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {visiblePreparations.map((item) => {
              const questionCount = item.questions.length;
              const practiced = item.questions.filter(
                (question) => question.isPracticed
              ).length;

              const topicCount = item.revisionTopics.length;
              const completed = item.revisionTopics.filter(
                (topic) => topic.isCompleted
              ).length;

              const taskCount = questionCount + topicCount;
              const completedCount = practiced + completed;

              const percentage = taskCount
                ? Math.round((completedCount / taskCount) * 100)
                : null;

              return (
                <article
                  key={item.applicationId}
                  style={{
                    padding: 16,
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    backgroundColor: "var(--surface)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <strong>{item.company}</strong>
                      <p style={{ color: "var(--muted)", margin: "5px 0" }}>
                        {item.role}
                      </p>
                    </div>

                    <span
                      style={{
                        padding: "5px 9px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: percentage === null ? "var(--surface-2)" : "var(--accent-soft)",
                        color: percentage === null ? "var(--muted)" : "var(--accent)",
                      }}
                    >
                      {percentage === null ? "Not started" : `${percentage}% ready`}
                    </span>
                  </div>

                  {percentage !== null && (
                    <div
                      style={{
                        height: 8,
                        backgroundColor: "var(--line)",
                        borderRadius: 20,
                        overflow: "hidden",
                        margin: "12px 0",
                      }}
                    >
                      <div
                        style={{
                          width: `${percentage}%`,
                          height: "100%",
                          backgroundColor: "var(--accent)",
                          borderRadius: 20,
                        }}
                      />
                    </div>
                  )}

                  <p style={{ fontSize: 13, color: "var(--muted)" }}>
                    {practiced}/{questionCount} questions practiced ·{" "}
                    {completed}/{topicCount} revision topics completed
                  </p>

                  <Link
                    to={`/applications/${item.applicationId}/preparation`}
                    style={{ color: "var(--accent)", fontWeight: 600 }}
                  >
                    Open Interview Prep →
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        {sortedPreparations.length > PREP_PREVIEW_LIMIT && (
          <button
            type="button"
            onClick={() => setShowAllPrep((value) => !value)}
            aria-expanded={showAllPrep}
            style={{
              marginTop: 16,
              padding: "8px 14px",
              border: "1px solid var(--line-strong)",
              borderRadius: 9,
              backgroundColor: "transparent",
              color: "var(--ink-2)",
              fontSize: 13,
            }}
          >
            {showAllPrep
              ? "Show fewer"
              : `Show all ${sortedPreparations.length} companies`}
          </button>
        )}
      </section>

    </main>
  );
}

export default Dashboard;
