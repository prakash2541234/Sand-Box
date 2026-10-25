import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { STEP_TITLES } from "./releases.js";
import {
  createRelease as apiCreateRelease,
  chooseDemoData,
  chooseEmptyWorkspace,
  deleteRelease as apiDeleteRelease,
  getDemoChoice,
  getReleases as apiGetReleases,
  isDemoMode,
  setReleaseStep as apiSetReleaseStep,
  updateReleaseInfo as apiUpdateReleaseInfo,
} from "./api.js";
import "./styles.css";

const DEMO_MODE = isDemoMode();

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function App() {
  const [releases, setReleases] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [infoDraft, setInfoDraft] = useState("");
  const [showWelcome, setShowWelcome] = useState(() => DEMO_MODE && getDemoChoice() === null);
  const selectedRelease = releases.find((release) => release.id === selectedId);

  useEffect(() => {
    apiGetReleases()
      .then((loadedReleases) => {
        setReleases(loadedReleases);
        setSelectedId(loadedReleases[0]?.id ?? null);
      })
      .catch((requestError) => setError(`Could not load releases: ${requestError.message}`))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setInfoDraft(selectedRelease?.info ?? "");
  }, [selectedRelease?.id, selectedRelease?.info]);

  function replaceRelease(updatedRelease) {
    setReleases((current) =>
      current.map((release) =>
        release.id === updatedRelease.id ? updatedRelease : release,
      ),
    );
  }

  async function performAction(action) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function createRelease(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void performAction(async () => {
      const release = await apiCreateRelease({
        name: form.get("name"),
        date: form.get("date"),
        info: form.get("info"),
      });
      setReleases((current) => [...current, release]);
      setSelectedId(release.id);
      setShowForm(false);
    });
  }

  function deleteRelease() {
    if (!selectedRelease) return;

    void performAction(async () => {
      const deleted = await apiDeleteRelease(selectedRelease.id);
      if (!deleted) throw new Error("The release could not be found.");
      const nextRelease = releases.find((release) => release.id !== selectedRelease.id);
      setReleases((current) =>
        current.filter((release) => release.id !== selectedRelease.id),
      );
      setSelectedId(nextRelease?.id ?? null);
    });
  }

  function updateStep(stepIndex) {
    const completed = !selectedRelease.completedSteps[stepIndex];
    void performAction(async () => {
      const updatedRelease = await apiSetReleaseStep(
        selectedRelease.id,
        stepIndex,
        completed,
      );
      replaceRelease(updatedRelease);
    });
  }

  function saveReleaseInfo() {
    if (!selectedRelease || infoDraft === selectedRelease.info) return;
    void performAction(async () => {
      const updatedRelease = await apiUpdateReleaseInfo(selectedRelease.id, infoDraft);
      replaceRelease(updatedRelease);
    });
  }

  function startWithDemoData() {
    try {
      const demoReleases = chooseDemoData();
      setReleases(demoReleases);
      setSelectedId(demoReleases[0]?.id ?? null);
      setShowWelcome(false);
      setError("");
    } catch (storageError) {
      setError(`Could not load local demo data: ${storageError.message}`);
    }
  }

  function startWithEmptyWorkspace() {
    try {
      chooseEmptyWorkspace();
      setReleases([]);
      setSelectedId(null);
      setShowWelcome(false);
      setError("");
    } catch (storageError) {
      setError(`Could not start an empty workspace: ${storageError.message}`);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Shipshape home">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>shipshape</span>
        </a>
        <span className="topbar-note">
          {DEMO_MODE ? "Local demo · data saved in this browser" : "A calmer way to ship"}
        </span>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-heading">
            <div>
              <p className="eyebrow">WORKSPACE</p>
              <h1>Releases</h1>
            </div>
            <button
              className="icon-button add-button"
              onClick={() => setShowForm((visible) => !visible)}
              disabled={loading || busy}
              aria-label={showForm ? "Close new release form" : "Add release"}
              title="Add release"
            >
              {showForm ? "×" : "+"}
            </button>
          </div>

          {showForm && (
            <form className="new-release-form" onSubmit={createRelease}>
              <label>
                Release name
                <input name="name" placeholder="e.g. Web app 2.1" required />
              </label>
              <label>
                Release date
                <input
                  name="date"
                  type="datetime-local"
                  defaultValue={new Date(Date.now() + 86400000)
                    .toISOString()
                    .slice(0, 16)}
                  required
                />
              </label>
              <label>
                Additional information
                <textarea name="info" placeholder="Optional notes" rows="2" />
              </label>
              <button className="primary-button" type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create release"}
              </button>
            </form>
          )}

          <div className="release-list">
            {releases.map((release) => (
              <button
                className={`release-list-item ${release.id === selectedId ? "selected" : ""}`}
                key={release.id}
                onClick={() => setSelectedId(release.id)}
              >
                <span className="list-item-topline">
                  <span className="release-name">{release.name}</span>
                  <span className={`status-dot ${release.status}`} />
                </span>
                <span className="list-item-date">{formatDate(release.date)}</span>
                <span className={`status-label ${release.status}`}>{release.status}</span>
              </button>
            ))}
            {!loading && releases.length === 0 && (
              <p className="empty-list">No releases yet. Add one to get started.</p>
            )}
          </div>
          <div className="sidebar-footer">
            <span className="avatar">D</span>
            <span>Release workspace</span>
            <span className="demo-tag">TEAM</span>
          </div>
        </aside>

        <section className="main-panel">
          {error && <div className="error-banner" role="alert">{error}</div>}
          {loading ? (
            <div className="welcome-state" role="status">Loading releases…</div>
          ) : selectedRelease ? (
            <>
              <div className="release-header">
                <div>
                  <div className="breadcrumb">Releases <span>/</span> Overview</div>
                  <div className="title-row">
                    <h2>{selectedRelease.name}</h2>
                    <span className={`status-pill ${selectedRelease.status}`}>
                      <span className="status-dot" />
                      {selectedRelease.status}
                    </span>
                  </div>
                  <p className="date-line">
                    <span aria-hidden="true">◷</span> {formatDate(selectedRelease.date)}
                  </p>
                </div>
                <button className="delete-button" onClick={deleteRelease} disabled={busy}>
                  Delete release
                </button>
              </div>

              <div className="content-grid">
                <section className="card checklist-card">
                  <div className="card-heading">
                    <div>
                      <p className="eyebrow">THE PLAN</p>
                      <h3>Release checklist</h3>
                    </div>
                    <span className="completion-count">
                      {selectedRelease.completedSteps.filter(Boolean).length}
                      <span> / {STEP_TITLES.length} complete</span>
                    </span>
                  </div>
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-label="Checklist completion"
                    aria-valuenow={selectedRelease.completedSteps.filter(Boolean).length}
                    aria-valuemin="0"
                    aria-valuemax={STEP_TITLES.length}
                  >
                    <span
                      style={{
                        width: `${(selectedRelease.completedSteps.filter(Boolean).length / STEP_TITLES.length) * 100}%`,
                      }}
                    />
                  </div>
                  <ul className="checklist">
                    {STEP_TITLES.map((title, index) => {
                      const checked = selectedRelease.completedSteps[index];
                      return (
                        <li key={title}>
                          <label className={`checklist-row ${checked ? "completed" : ""}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => updateStep(index)}
                              disabled={busy}
                            />
                            <span className="custom-check" aria-hidden="true">
                              {checked ? "✓" : ""}
                            </span>
                            <span>{title}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <aside className="card details-card">
                  <p className="eyebrow">RELEASE DETAILS</p>
                  <h3>Additional information</h3>
                  <p className="details-hint">Keep useful context close to the release.</p>
                  <textarea
                    aria-label="Additional information"
                    className="info-input"
                    placeholder="Add notes, links, or anything the team should know..."
                    rows="6"
                    value={infoDraft}
                    disabled={busy}
                    onChange={(event) => setInfoDraft(event.target.value)}
                  />
                  <button
                    className="save-button"
                    onClick={saveReleaseInfo}
                    disabled={busy || infoDraft === selectedRelease.info}
                  >
                    {busy ? "Saving…" : infoDraft === selectedRelease.info ? "Saved" : "Save notes"}
                  </button>
                  <div className="detail-divider" />
                  <p className="eyebrow">STATUS GUIDE</p>
                  <div className="status-guide">
                    <span className="status-dot planned" /> Planned
                    <span className="status-dot ongoing" /> Ongoing
                    <span className="status-dot done" /> Done
                  </div>
                </aside>
              </div>
            </>
          ) : (
            <div className="welcome-state">
              <span className="welcome-icon">✓</span>
              <h2>Your next release starts here</h2>
              <p>Create a release to organize the steps before launch.</p>
              <button className="primary-button" onClick={() => setShowForm(true)}>
                Add your first release
              </button>
            </div>
          )}
        </section>
      </div>
      <footer className="page-footer">
        <span>Built for the little details before the big launch.</span>
        <span>{DEMO_MODE ? "Demo data · Browser storage only" : "Release data · Stored in PostgreSQL"}</span>
      </footer>
      {showWelcome && (
        <div className="welcome-backdrop">
          <section
            aria-labelledby="welcome-title"
            aria-modal="true"
            className="welcome-dialog"
            role="dialog"
          >
            <span className="welcome-icon">S</span>
            <p className="eyebrow">WELCOME TO SHIPSHAPE</p>
            <h2 id="welcome-title">How would you like to get started?</h2>
            <p className="welcome-description">
              Start with a clean workspace, or explore the release checklist with sample data.
              Your choice is saved in this browser.
            </p>
            <div className="welcome-actions">
              <button className="primary-button" onClick={startWithEmptyWorkspace}>
                Start with an empty workspace
              </button>
              <button className="demo-data-button" onClick={startWithDemoData}>
                Load local demo data
              </button>
            </div>
            <p className="welcome-footnote">
              Demo releases are saved only in this browser and are not stored in PostgreSQL.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
