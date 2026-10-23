
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getPreparation,
  createPreparation,
  updatePreparation,
} from "../services/interviewPreparationService";

const cardStyle = {
  padding: 22,
  border: "1px solid var(--line)",
  borderRadius: 16,
  background: "var(--surface)",
  marginBottom: 18,
  boxShadow: "0 3px 12px rgba(0, 0, 0, 0.04)",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: 12,
  marginTop: 6,
  border: "1px solid var(--line-strong)",
  borderRadius: 8,
  fontSize: 14,
};

const buttonStyle = {
  padding: "12px 18px",
  backgroundColor: "var(--accent)",
  color: "var(--surface)",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};

const toDateTimeLocal = (date) => {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "";

  const offset = parsedDate.getTimezoneOffset();

  return new Date(parsedDate.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 16);
};

function InterviewPreparation() {
  const { applicationId } = useParams();

  const [preparation, setPreparation] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [interviewDate, setInterviewDate] = useState("");
  const [interviewType, setInterviewType] = useState("Technical");
  const [preparationNotes, setPreparationNotes] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  const [questionText, setQuestionText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [questionCategory, setQuestionCategory] = useState("Technical");
  const [revisionTopicText, setRevisionTopicText] = useState("");
  const [savingQuestion, setSavingQuestion] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPreparation() {
      try {
        let data;

        try {
          data = await getPreparation(applicationId);
        } catch (err) {
          if (err.message === "Preparation workspace not found") {
            data = await createPreparation(applicationId);
          } else {
            throw err;
          }
        }

        if (!data.application) {
          data = await getPreparation(applicationId);
        }

        if (cancelled) return;

        setPreparation(data.preparation);
        setApplication(data.application);

        setInterviewDate(
          toDateTimeLocal(data.preparation?.interviewDate)
        );
        setInterviewType(
          data.preparation?.interviewType || "Technical"
        );
        setPreparationNotes(
          data.preparation?.preparationNotes || ""
        );
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load preparation workspace.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPreparation();

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  // SAVE INTERVIEW DETAILS AND NOTES

  const handleSaveDetails = async (event) => {
    event.preventDefault();

    if (!preparation || savingDetails) return;

    setError("");
    setSuccess("");
    setSavingDetails(true);

    try {
      const result = await updatePreparation(applicationId, {
        interviewDate: interviewDate
          ? new Date(interviewDate).toISOString()
          : null,
        interviewType,
        preparationNotes: preparationNotes.trim(),
      });

      setPreparation(result.preparation);
      setInterviewDate(
        toDateTimeLocal(result.preparation?.interviewDate)
      );
      setSuccess("Your interview details have been saved!");
    } catch (err) {
      setError(err.message || "Could not save interview details.");
    } finally {
      setSavingDetails(false);
    }
  };

  // QUESTION BANK HANDLERS

  const handleAddQuestion = async (event) => {
    event.preventDefault();

    if (!questionText.trim()) {
      setError("Please enter a question.");
      return;
    }

    if (!preparation || savingQuestion) {
      setError("Preparation workspace is not ready yet.");
      return;
    }

    setSavingQuestion(true);
    setError("");
    setSuccess("");

    try {
      const updatedQuestions = [
        ...(preparation.questions || []),
        {
          question: questionText.trim(),
          answer: answerText.trim(),
          category: questionCategory,
          isPracticed: false,
        },
      ];

      const result = await updatePreparation(applicationId, {
        questions: updatedQuestions,
      });

      setPreparation(result.preparation);
      setQuestionText("");
      setAnswerText("");
      setQuestionCategory("Technical");
      setSuccess("Question saved successfully!");
    } catch (err) {
      setError(err.message || "Could not save question.");
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleTogglePracticed = async (questionIndex) => {
    if (!preparation || savingQuestion) return;

    setError("");
    setSuccess("");
    setSavingQuestion(true);

    const updatedQuestions = (preparation.questions || []).map(
      (question, index) =>
        index === questionIndex
          ? { ...question, isPracticed: !question.isPracticed }
          : question
    );

    try {
      const result = await updatePreparation(applicationId, {
        questions: updatedQuestions,
      });

      setPreparation(result.preparation);
      setSuccess("Practice progress updated!");
    } catch (err) {
      setError(err.message || "Could not update practice status.");
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionIndex) => {
    if (!preparation || savingQuestion) return;

    if (!window.confirm("Are you sure you want to delete this question?")) {
      return;
    }

    setError("");
    setSuccess("");
    setSavingQuestion(true);

    const updatedQuestions = (preparation.questions || []).filter(
      (_, index) => index !== questionIndex
    );

    try {
      const result = await updatePreparation(applicationId, {
        questions: updatedQuestions,
      });

      setPreparation(result.preparation);
      setSuccess("Question deleted successfully.");
    } catch (err) {
      setError(err.message || "Could not delete question.");
    } finally {
      setSavingQuestion(false);
    }
  };

  // REVISION TOPIC HANDLERS

  const handleAddRevisionTopic = async (event) => {
    event.preventDefault();

    if (!revisionTopicText.trim()) {
      setError("Please enter a revision topic.");
      return;
    }

    if (!preparation || savingQuestion) return;

    setError("");
    setSuccess("");
    setSavingQuestion(true);

    try {
      const result = await updatePreparation(applicationId, {
        revisionTopics: [
          ...(preparation.revisionTopics || []),
          {
            topic: revisionTopicText.trim(),
            isCompleted: false,
          },
        ],
      });

      setPreparation(result.preparation);
      setRevisionTopicText("");
      setSuccess("Revision topic added successfully!");
    } catch (err) {
      setError(err.message || "Could not add revision topic.");
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleToggleRevisionTopic = async (topicIndex) => {
    if (!preparation || savingQuestion) return;

    setError("");
    setSuccess("");
    setSavingQuestion(true);

    const updatedTopics = (preparation.revisionTopics || []).map(
      (item, index) =>
        index === topicIndex
          ? { ...item, isCompleted: !item.isCompleted }
          : item
    );

    try {
      const result = await updatePreparation(applicationId, {
        revisionTopics: updatedTopics,
      });

      setPreparation(result.preparation);
      setSuccess("Revision progress updated!");
    } catch (err) {
      setError(err.message || "Could not update revision progress.");
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteRevisionTopic = async (topicIndex) => {
    if (!preparation || savingQuestion) return;

    if (!window.confirm("Delete this revision topic?")) return;

    setError("");
    setSuccess("");
    setSavingQuestion(true);

    const updatedTopics = (preparation.revisionTopics || []).filter(
      (_, index) => index !== topicIndex
    );

    try {
      const result = await updatePreparation(applicationId, {
        revisionTopics: updatedTopics,
      });

      setPreparation(result.preparation);
      setSuccess("Revision topic deleted successfully.");
    } catch (err) {
      setError(err.message || "Could not delete revision topic.");
    } finally {
      setSavingQuestion(false);
    }
  };

  if (loading) {
    return (
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: 30 }}>
        Loading your preparation workspace...
      </main>
    );
  }

  if (error && !preparation) {
    return (
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: 30 }}>
        <h2>Unable to load preparation</h2>
        <p style={{ color: "crimson" }}>{error}</p>
        <Link to="/applications">Back to Applications</Link>
      </main>
    );
  }

  const questions = preparation?.questions || [];
  const practicedCount = questions.filter(
    (question) => question.isPracticed
  ).length;

  const questionProgress = questions.length
    ? Math.round((practicedCount / questions.length) * 100)
    : 0;

  const revisionTopics = preparation?.revisionTopics || [];
  const completedTopics = revisionTopics.filter(
    (item) => item.isCompleted
  ).length;

  const revisionProgress = revisionTopics.length
    ? Math.round((completedTopics / revisionTopics.length) * 100)
    : 0;

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "30px 20px",
        color: "var(--ink)",
      }}
    >
      <Link to="/applications">← Back to Applications</Link>

      <header style={{ margin: "24px 0" }}>
        <p style={{ color: "var(--accent)", fontWeight: 700 }}>
          CAREERTRACK / PREPARATION
        </p>
        <h1>{application?.company || "Interview Preparation"}</h1>
        <p style={{ color: "var(--muted)" }}>
          {application?.role || "Your preparation workspace"}
        </p>
      </header>

      {error && (
        <div
          role="alert"
          style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 8,
            background: "var(--danger-soft)",
            color: "var(--danger)",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 8,
            background: "var(--ok-soft)",
            color: "var(--ok)",
          }}
        >
          {success}
        </div>
      )}

      {/* INTERVIEW PLANNER */}

      <section style={cardStyle}>
        <h2>Interview Planner</h2>
        <p style={{ color: "var(--muted)" }}>
          Set your interview date and organize the type of interview.
        </p>

        <form onSubmit={handleSaveDetails}>
          <div style={{ display: "grid", gap: 16 }}>
            <label htmlFor="interviewType">
              Interview type
              <select
                id="interviewType"
                name="interviewType"
                value={interviewType}
                onChange={(event) => setInterviewType(event.target.value)}
                style={inputStyle}
              >
                <option value="Technical">Technical Interview</option>
                <option value="HR">HR Interview</option>
                <option value="Assessment">Assessment</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label htmlFor="interviewDate">
              Interview date and time
              <input
                id="interviewDate"
                name="interviewDate"
                type="datetime-local"
                value={interviewDate}
                onChange={(event) => setInterviewDate(event.target.value)}
                style={inputStyle}
              />
            </label>

            <button
              type="submit"
              disabled={savingDetails}
              style={{
                ...buttonStyle,
                opacity: savingDetails ? 0.7 : 1,
              }}
            >
              {savingDetails ? "Saving..." : "Save Interview Details"}
            </button>
          </div>
        </form>
      </section>

      {/* PREPARATION NOTES */}

      <section style={cardStyle}>
        <h2>My Preparation Notes</h2>
        <p style={{ color: "var(--muted)" }}>
          Keep company research, project explanations, and reminders in one place.
        </p>

        <form onSubmit={handleSaveDetails}>
          <label htmlFor="preparationNotes">
            Your notes
            <textarea
              id="preparationNotes"
              name="preparationNotes"
              value={preparationNotes}
              onChange={(event) => setPreparationNotes(event.target.value)}
              placeholder="Review React hooks, REST APIs, MongoDB, and my CareerTrack project..."
              rows={8}
              style={{
                ...inputStyle,
                resize: "vertical",
                lineHeight: 1.6,
              }}
            />
          </label>

          <button
            type="submit"
            disabled={savingDetails}
            style={{
              ...buttonStyle,
              marginTop: 12,
              opacity: savingDetails ? 0.7 : 1,
            }}
          >
            {savingDetails ? "Saving..." : "Save Preparation Notes"}
          </button>
        </form>
      </section>

      {/* INTERVIEW QUESTION BANK */}

      <section style={cardStyle}>
        <h2>Interview Question Bank</h2>
        <p>
          Add company-specific questions, write answers, and track your practice progress.
        </p>

        <form onSubmit={handleAddQuestion}>
          <div style={{ display: "grid", gap: 14 }}>
            <label htmlFor="questionText">
              Interview question *
              <input
                id="questionText"
                name="questionText"
                type="text"
                value={questionText}
                onChange={(event) => setQuestionText(event.target.value)}
                placeholder="e.g. Explain React useEffect"
                required
                style={inputStyle}
              />
            </label>

            <label htmlFor="questionCategory">
              Category
              <select
                id="questionCategory"
                name="questionCategory"
                value={questionCategory}
                onChange={(event) => setQuestionCategory(event.target.value)}
                style={inputStyle}
              >
                <option value="Technical">Technical</option>
                <option value="HR">HR</option>
                <option value="Behavioral">Behavioral</option>
                <option value="Project">Project</option>
              </select>
            </label>

            <label htmlFor="answerText">
              Your answer
              <textarea
                id="answerText"
                name="answerText"
                value={answerText}
                onChange={(event) => setAnswerText(event.target.value)}
                placeholder="Write your answer or key points..."
                rows={4}
                style={inputStyle}
              />
            </label>

            <button
              type="submit"
              disabled={savingQuestion}
              style={{
                ...buttonStyle,
                opacity: savingQuestion ? 0.7 : 1,
              }}
            >
              {savingQuestion ? "Saving..." : "Add Question"}
            </button>
          </div>
        </form>

        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            marginTop: 24,
          }}
        >
          <div>
            <strong>{questions.length}</strong>
            <p style={{ margin: "4px 0", color: "var(--muted)" }}>Total questions</p>
          </div>
          <div>
            <strong>{practicedCount}</strong>
            <p style={{ margin: "4px 0", color: "var(--muted)" }}>Practiced</p>
          </div>
          <div>
            <strong>{questionProgress}%</strong>
            <p style={{ margin: "4px 0", color: "var(--muted)" }}>Practice progress</p>
          </div>
        </div>

        <h3 style={{ marginTop: 24 }}>
          Saved Questions ({questions.length})
        </h3>

        {questions.length === 0 ? (
          <p>No questions yet. Add your first one above!</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {questions.map((item, index) => (
              <article
                key={item._id || index}
                style={{
                  padding: 16,
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  background: "var(--surface-2)",
                }}
              >
                <p style={{ color: "var(--accent)", fontWeight: 700, marginTop: 0 }}>
                  {item.category || "Technical"}
                </p>

                <h4 style={{ marginBottom: 8 }}>
                  {index + 1}. {item.question}
                </h4>

                <p style={{ whiteSpace: "pre-wrap" }}>
                  {item.answer || "No answer written yet."}
                </p>

                <p
                  style={{
                    color: item.isPracticed ? "var(--ok)" : "var(--muted)",
                    fontWeight: 600,
                  }}
                >
                  {item.isPracticed ? "Practiced ✓" : "Not practiced yet"}
                </p>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={savingQuestion}
                    onClick={() => handleTogglePracticed(index)}
                    style={{
                      ...buttonStyle,
                      backgroundColor: item.isPracticed ? "var(--muted)" : "var(--accent)",
                    }}
                  >
                    {item.isPracticed ? "Mark Not Practiced" : "Mark as Practiced"}
                  </button>

                  <button
                    type="button"
                    disabled={savingQuestion}
                    onClick={() => handleDeleteQuestion(index)}
                    style={{
                      ...buttonStyle,
                      backgroundColor: "var(--danger)",
                    }}
                  >
                    Delete Question
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* REVISION TOPICS */}

      <section style={cardStyle}>
        <h2>Revision Topics</h2>
        <p style={{ color: "var(--muted)" }}>
          Build your revision checklist and track what you have mastered.
        </p>

        <form
          onSubmit={handleAddRevisionTopic}
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            id="revisionTopicText"
            name="revisionTopicText"
            aria-label="Revision topic"
            type="text"
            value={revisionTopicText}
            onChange={(event) => setRevisionTopicText(event.target.value)}
            placeholder="e.g. React Hooks, REST APIs, MongoDB"
            required
            style={{
              ...inputStyle,
              flex: "1 1 240px",
              marginTop: 0,
            }}
          />

          <button
            type="submit"
            disabled={savingQuestion}
            style={{
              ...buttonStyle,
              opacity: savingQuestion ? 0.7 : 1,
            }}
          >
            {savingQuestion ? "Saving..." : "Add Topic"}
          </button>
        </form>

        <div style={{ marginTop: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            <strong>Revision progress</strong>
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>
              {completedTopics} of {revisionTopics.length} completed · {revisionProgress}%
            </span>
          </div>

          <div
            role="progressbar"
            aria-label="Revision topic completion"
            aria-valuenow={revisionProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              width: "100%",
              height: 10,
              borderRadius: 999,
              background: "var(--line)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${revisionProgress}%`,
                height: "100%",
                background: "var(--accent)",
                borderRadius: 999,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
          {revisionTopics.length === 0 ? (
            <div
              style={{
                padding: 20,
                textAlign: "center",
                background: "var(--surface-2)",
                border: "1px dashed var(--line-strong)",
                borderRadius: 12,
              }}
            >
              <p style={{ marginTop: 0, fontWeight: 600 }}>
                Your revision list is empty.
              </p>
              <p style={{ marginBottom: 0, color: "var(--muted)" }}>
                Add your first topic above to start preparing!
              </p>
            </div>
          ) : (
            revisionTopics.map((item, index) => (
              <div
                key={item._id || index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  padding: 14,
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  background: item.isCompleted ? "var(--ok-soft)" : "var(--surface-2)",
                }}
              >
                <label
                  htmlFor={`revision-topic-${item._id || index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flex: "1 1 200px",
                    cursor: savingQuestion ? "wait" : "pointer",
                  }}
                >
                  <input
                    id={`revision-topic-${item._id || index}`}
                    name={`revision-topic-${item._id || index}`}
                    type="checkbox"
                    checked={Boolean(item.isCompleted)}
                    disabled={savingQuestion}
                    onChange={() => handleToggleRevisionTopic(index)}
                    style={{
                      width: 18,
                      height: 18,
                      accentColor: "var(--accent)",
                    }}
                  />

                  <span
                    style={{
                      textDecoration: item.isCompleted ? "line-through" : "none",
                      color: item.isCompleted ? "var(--ok)" : "var(--ink)",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {item.topic}
                  </span>
                </label>

                <button
                  type="button"
                  disabled={savingQuestion}
                  onClick={() => handleDeleteRevisionTopic(index)}
                  style={{
                    ...buttonStyle,
                    padding: "8px 12px",
                    backgroundColor: "var(--danger)",
                  }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

export default InterviewPreparation;
