import { useEffect, useState } from "react";
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
} from "../services/noteService";

function Notes() {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Without a saved token there is nothing to fetch, so the first render
  // already shows the login message instead of setting state in an effect.
  const [message, setMessage] = useState(() =>
    localStorage.getItem("token") ? "" : "Please login first."
  );
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem("token"))
  );

  // State for editing an existing note
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // Load notes once when the page mounts. State only changes after the
  // request settles, and `cancelled` stops updates if the page unmounts first.
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) return;

    let cancelled = false;

    async function loadNotes() {
      try {
        const data = await getNotes(token);

        if (!cancelled) {
          setNotes(data.notes || []);
          setMessage("");
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadNotes();

    return () => {
      cancelled = true;
    };
  }, []);

  // Re-fetch notes after a save. This runs from event handlers only,
  // where setting state directly is fine.
  const fetchNotes = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please login first.");
      setLoading(false);
      return;
    }

    try {
      const data = await getNotes(token);
      setNotes(data.notes || []);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this note?"
    );

    if (!confirmed) return;

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please login first.");
      return;
    }

    try {
      await deleteNote(id, token);

      setNotes((previousNotes) =>
        previousNotes.filter((note) => note._id !== id)
      );

      setMessage("Note deleted successfully!");
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Create a new note
  const handleCreateNote = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please login first.");
      return;
    }

    if (!title.trim() || !content.trim()) {
      setMessage("Please enter both a title and content.");
      return;
    }

    try {
      setMessage("Saving note...");

      await createNote(
        {
          title: title.trim(),
          content: content.trim(),
        },
        token
      );

      setTitle("");
      setContent("");
      setMessage("Note created successfully!");

      await fetchNotes();
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Open a note in edit mode
  const handleEditClick = (note) => {
    setEditingId(note._id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setMessage("");
  };

  // Save changes to an existing note
  const handleUpdateNote = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please login first.");
      return;
    }

    if (!editTitle.trim() || !editContent.trim()) {
      setMessage("Please enter both a title and content.");
      return;
    }

    try {
      setMessage("Updating note...");

      await updateNote(
        editingId,
        {
          title: editTitle.trim(),
          content: editContent.trim(),
        },
        token
      );

      setEditingId(null);
      setEditTitle("");
      setEditContent("");
      setMessage("Note updated successfully!");

      await fetchNotes();
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
    setMessage("");
  };

  const isError = /fail|error|please|could not|not found|unauthor/i.test(message);

  return (
    <main className="container">
      <header className="page-head">
        <p className="eyebrow">Notes</p>
        <h1>Keep your thinking in one place</h1>
        <p className="lede">
          Resume bullets, recruiter details, stories for behavioural rounds.
        </p>
      </header>

      <div className="notes-layout">
        <section className="card" aria-labelledby="create-note">
          <h2 id="create-note">New note</h2>

          <form onSubmit={handleCreateNote}>
            <div className="field">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Questions to ask the recruiter"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="content">Content</label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note..."
                rows={5}
                required
              />
            </div>

            <button type="submit" className="btn btn-block">
              Save note
            </button>
          </form>

          {message && (
            <p role="status" className={`notice${isError ? " error" : " success"}`}>
              {message}
            </p>
          )}
        </section>

        <section aria-labelledby="saved-notes">
          <h2 id="saved-notes">Saved notes ({notes.length})</h2>

          {loading ? (
            <p className="lede">Loading notes...</p>
          ) : notes.length === 0 ? (
            <div className="empty">
              No notes yet. Write your first one on the left.
            </div>
          ) : (
            <div className="notes-list">
              {notes.map((note) => (
                <article key={note._id} className="card note">
                  {editingId === note._id ? (
                    <form onSubmit={handleUpdateNote}>
                      <div className="field">
                        <label htmlFor={`edit-title-${note._id}`}>Title</label>
                        <input
                          id={`edit-title-${note._id}`}
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Note title"
                          required
                        />
                      </div>

                      <div className="field">
                        <label htmlFor={`edit-content-${note._id}`}>Content</label>
                        <textarea
                          id={`edit-content-${note._id}`}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          placeholder="Note content"
                          rows={4}
                          required
                        />
                      </div>

                      <div className="note-actions">
                        <button type="submit" className="btn btn-sm">
                          Save changes
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <h3>{note.title}</h3>
                      <p>{note.content}</p>

                      <div className="note-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleEditClick(note)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger-ghost btn-sm"
                          onClick={() => handleDeleteNote(note._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default Notes;