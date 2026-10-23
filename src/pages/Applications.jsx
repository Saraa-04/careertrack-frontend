import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
} from "../services/applicationService";
import { parseLocalDate } from "../utils/dates";

const emptyForm = {
  company: "",
  role: "",
  status: "Wishlist",
  jobLink: "",
  deadline: "",
  notes: "",
};

const statusColors = {
  Wishlist: "#8a8f98",
  Applied: "#3b6fd4",
  Assessment: "#7c5cc4",
  Interview: "#c9811a",
  Offer: "#1f8a5b",
  Rejected: "#c8453b",
};

const outlineButtonStyle = {
  padding: "8px 14px",
  backgroundColor: "transparent",
  color: "var(--ink-2)",
  border: "1px solid var(--line-strong)",
  borderRadius: "9px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "600",
};

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  marginTop: "6px",
  border: "1px solid var(--line-strong)",
  borderRadius: "8px",
  fontSize: "14px",
};

const buttonStyle = {
  padding: "10px 16px",
  backgroundColor: "var(--accent)",
  color: "var(--surface)",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "600",
};

const deleteButtonStyle = {
  ...outlineButtonStyle,
  color: "var(--danger)",
  borderColor: "var(--danger-line)",
};

const secondaryButtonStyle = {
  ...outlineButtonStyle,
};

const getDeadlineInfo = (deadline) => {
  if (!deadline) {
    return {
      label: "No deadline set",
      type: "none",
    };
  }

  // Compare calendar dates in local time to avoid
  // incorrectly marking today's deadline as overdue.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = parseLocalDate(deadline);

  if (Number.isNaN(dueDate.getTime())) {
    return {
      label: "Invalid deadline",
      type: "none",
    };
  }

  dueDate.setHours(0, 0, 0, 0);

  const daysLeft = Math.round(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft < 0) {
    const daysOverdue = Math.abs(daysLeft);

    return {
      label: `Overdue by ${daysOverdue} day${daysOverdue === 1 ? "" : "s"}`,
      type: "overdue",
    };
  }

  if (daysLeft === 0) {
    return {
      label: "Due today",
      type: "today",
    };
  }

  if (daysLeft <= 3) {
    return {
      label: `Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
      type: "soon",
    };
  }

  return {
    label: `Due in ${daysLeft} days`,
    type: "upcoming",
  };
};

const deadlineColors = {
  overdue: {
    background: "var(--danger-soft)",
    color: "var(--danger)",
  },
  today: {
    background: "var(--warn-soft)",
    color: "#9A3412",
  },
  soon: {
    background: "var(--warn-soft)",
    color: "var(--warn)",
  },
  upcoming: {
    background: "var(--ok-soft)",
    color: "var(--ok)",
  },
  none: {
    background: "var(--surface-2)",
    color: "var(--ink-2)",
  },
};

function Applications() {
  const [applications, setApplications] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("deadline");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Load applications once when the page mounts.
  // `loading` already starts as true and `error` as "", so nothing is set
  // synchronously here. State only changes after the request settles, and
  // the `cancelled` flag stops updates if the page unmounts first.
  useEffect(() => {
    let cancelled = false;

    async function loadApplications() {
      try {
        const data = await getApplications();

        if (!cancelled) {
          setApplications(data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
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

  const visibleApplications = applications
    .filter((application) => {
      const search = searchTerm.trim().toLowerCase();

      const matchesSearch =
        application.company?.toLowerCase().includes(search) ||
        application.role?.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All" || application.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "company") {
        return (a.company || "").localeCompare(b.company || "");
      }

      if (sortBy === "deadline") {
        // Applications without a deadline go to the bottom.
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;

        return parseLocalDate(a.deadline) - parseLocalDate(b.deadline);
      }

      // Newest applications first
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  // Summary stats (these must live out here, not inside the filter callback,
  // so the JSX below can read them).
  const activeApplications = applications.filter(
    (application) => !["Offer", "Rejected"].includes(application.status)
  );

  const overdueCount = activeApplications.filter(
    (application) =>
      getDeadlineInfo(application.deadline).type === "overdue"
  ).length;

  const dueSoonCount = activeApplications.filter((application) =>
    ["today", "soon"].includes(getDeadlineInfo(application.deadline).type)
  ).length;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormMessage("");

    const applicationData = {
      ...form,
      company: form.company.trim(),
      role: form.role.trim(),
      jobLink: form.jobLink.trim(),
      notes: form.notes.trim(),
      deadline: form.deadline || null,
    };

    try {
      if (editingId) {
        const updatedApplication = await updateApplication(
          editingId,
          applicationData
        );

        setApplications((previous) =>
          previous.map((application) =>
            application._id === editingId
              ? {
                ...application,
                ...applicationData,
                ...(updatedApplication || {}),
              }
              : application
          )
        );

        setFormMessage("Application updated successfully!");
        setEditingId(null);
      } else {
        const newApplication = await createApplication(applicationData);

        setApplications((previous) => [newApplication, ...previous]);

        setFormMessage("Application added successfully!");
      }

      setForm(emptyForm);
    } catch (err) {
      setFormMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (application) => {
    setEditingId(application._id);

    setForm({
      company: application.company || "",
      role: application.role || "",
      status: application.status || "Wishlist",
      jobLink: application.jobLink || "",
      deadline: application.deadline
        ? String(application.deadline).slice(0, 10)
        : "",
      notes: application.notes || "",
    });

    setFormMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormMessage("");
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this application? This cannot be undone."
    );

    if (!confirmed) return;

    setDeletingId(id);
    setFormMessage("");

    try {
      await deleteApplication(id);

      setApplications((previous) =>
        previous.filter((application) => application._id !== id)
      );

      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
      }

      setFormMessage("Application deleted successfully!");
    } catch (err) {
      setFormMessage(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <p style={{ padding: "36px 20px", color: "var(--muted)" }}>Loading your applications...</p>;
  }

  if (error) {
    return <p style={{ padding: "36px 20px", color: "var(--danger)" }}>{error}</p>;
  }

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "36px 20px 64px",
      }}
    >
      <p className="eyebrow">Applications</p>
      <h1>Every opportunity, one list</h1>
      <p className="lede">Keep track of your internship and job applications.</p>

      <section
        style={{
          margin: "28px 0",
          padding: "24px",
          border: "1px solid var(--line)",
          background: "var(--surface)",
          borderRadius: "16px",
        }}
      >
        <h2>{editingId ? "Edit Application" : "Add a New Application"}</h2>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "grid",
              gap: "16px 20px",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            <label>
              Company Name *
              <input
                type="text"
                placeholder="e.g. Google"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                required
                style={inputStyle}
              />
            </label>

            <label>
              Job Role *
              <input
                type="text"
                placeholder="e.g. Frontend Developer Intern"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                required
                style={inputStyle}
              />
            </label>

            <label>
              Application Status
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                style={inputStyle}
              >
                <option value="Wishlist">Wishlist</option>
                <option value="Applied">Applied</option>
                <option value="Assessment">Assessment</option>
                <option value="Interview">Interview</option>
                <option value="Offer">Offer</option>
                <option value="Rejected">Rejected</option>
              </select>
            </label>

            <label>
              Job Posting Link
              <input
                type="url"
                placeholder="https://..."
                value={form.jobLink}
                onChange={(e) => setForm({ ...form, jobLink: e.target.value })}
                style={inputStyle}
              />
            </label>

            <label>
              Application Deadline
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                style={inputStyle}
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Notes
              <textarea
                placeholder="Recruiter details, interview preparation..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                style={inputStyle}
              />
            </label>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                gridColumn: "1 / -1",
              }}
            >
              <button type="submit" disabled={saving} style={buttonStyle}>
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Add Application"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={secondaryButtonStyle}
                >
                  Cancel
                </button>
              )}
            </div>

            {formMessage && <p role="status">{formMessage}</p>}
          </div>
        </form>
      </section>

      {/* Summary stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          margin: "24px 0",
        }}
      >
        <div
          style={{
            padding: "18px",
            borderRadius: "12px",
            border: "1px solid var(--line-strong)",
          }}
        >
          <p>Total applications</p>
          <h2>{applications.length}</h2>
        </div>

        <div
          style={{
            padding: "18px",
            borderRadius: "12px",
            background: "var(--danger-soft)",
            color: "var(--danger)",
          }}
        >
          <p>Overdue deadlines</p>
          <h2>{overdueCount}</h2>
        </div>

        <div
          style={{
            padding: "18px",
            borderRadius: "12px",
            background: "var(--warn-soft)",
            color: "var(--warn)",
          }}
        >
          <p>Due within 3 days</p>
          <h2>{dueSoonCount}</h2>
        </div>
      </div>

      <h2>My Applications ({visibleApplications.length})</h2>

      {/* Search, filter, and sort */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: "12px",
          margin: "16px 0 24px",
        }}
      >
        <input
          type="search"
          name="applicationSearch"
          aria-label="Search applications"
          placeholder="Search company or job role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={inputStyle}
        />

        <select
          name="statusFilter"
          aria-label="Filter by application status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={inputStyle}
        >
          <option value="All">All statuses</option>
          <option value="Wishlist">Wishlist</option>
          <option value="Applied">Applied</option>
          <option value="Assessment">Assessment</option>
          <option value="Interview">Interview</option>
          <option value="Offer">Offer</option>
          <option value="Rejected">Rejected</option>
        </select>

        <select
          name="applicationSort"
          aria-label="Sort applications"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={inputStyle}
        >
          <option value="deadline">Nearest deadline</option>
          <option value="newest">Newest first</option>
          <option value="company">Company name A–Z</option>
        </select>
      </div>

      {applications.length === 0 ? (
        <p>No applications yet. Add your first opportunity soon!</p>
      ) : visibleApplications.length === 0 ? (
        <div
          style={{
            padding: "24px",
            textAlign: "center",
            border: "1px dashed var(--line-strong)",
            borderRadius: "12px",
          }}
        >
          <h3>No matching applications</h3>
          <p>Try another search term or change your filters.</p>

          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("All");
              setSortBy("deadline");
            }}
            style={secondaryButtonStyle}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "16px",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 440px), 1fr))",
          }}
        >
          {visibleApplications.map((application) => (
            <article
              key={application._id}
              style={{
                padding: "20px",
                border: "1px solid var(--line)",
                borderRadius: "14px",
                backgroundColor: "var(--surface)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div>
                  <h3 style={{ marginBottom: 2 }}>{application.role}</h3>
                  <p style={{ color: "var(--muted)", marginBottom: 12 }}>
                    {application.company}
                  </p>
                </div>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--ink-2)",
                    padding: "4px 10px",
                    borderRadius: "999px",
                    border: "1px solid var(--line)",
                    background: "var(--surface-2)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: statusColors[application.status] || "var(--muted)",
                    }}
                  />
                  {application.status}
                </span>
              </div>

              {application.deadline && (
                <div style={{ margin: "12px 0" }}>
                  <p style={{ marginBottom: "8px" }}>
                    Deadline:{" "}
                    {parseLocalDate(application.deadline).toLocaleDateString()}
                  </p>

                  {/*
                    Terminal stages do not need active deadline warnings.
                    Remove the status check if you want warnings for every stage.
                  */}
                  {(() => {
                    const isClosed = ["Offer", "Rejected"].includes(
                      application.status
                    );

                    const info = getDeadlineInfo(application.deadline);
                    const colors = isClosed
                      ? deadlineColors.none
                      : deadlineColors[info.type];

                    return (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "6px 10px",
                          borderRadius: "20px",
                          backgroundColor: colors.background,
                          color: colors.color,
                          fontSize: "13px",
                          fontWeight: "600",
                        }}
                      >
                        {isClosed ? "Deadline status inactive" : info.label}
                      </span>
                    );
                  })()}
                </div>
              )}

              {application.jobLink && (
                <p>
                  <a
                    href={application.jobLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View job posting
                  </a>
                </p>
              )}

              {application.notes && <p>{application.notes}</p>}

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "auto",
                  paddingTop: "14px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleEdit(application)}
                  style={outlineButtonStyle}
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(application._id)}
                  disabled={deletingId === application._id}
                  style={deleteButtonStyle}
                >
                  {deletingId === application._id ? "Deleting..." : "Delete"}
                </button>
                <Link
                  to={`/applications/${application._id}/preparation`}
                  style={{
                    ...buttonStyle,
                    padding: "8px 14px",
                    fontSize: "13px",
                    display: "inline-block",
                    textDecoration: "none",
                    boxSizing: "border-box",
                    marginLeft: "auto",
                  }}
                >
                  Interview Prep
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default Applications;