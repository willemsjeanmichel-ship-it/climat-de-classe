import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";

const ACTIVITY_STORAGE_KEY = "climat-classe-admin-activity";
const ACTIVITY_EVENT = "climat-classe-history-updated";

function SessionControls({ selectedClass }) {
  const [activeSession, setActiveSession] = useState(null);
  const [loadingAction, setLoadingAction] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!selectedClass) {
      setActiveSession(null);
      setFeedback({ type: "", text: "" });
      return;
    }

    loadSession();

    const channel = supabase
      .channel(`session-controls-${selectedClass.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `class_id=eq.${selectedClass.id}`
        },
        () => {
          loadSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClass]);

  function pushActivity(actionType) {
    if (!selectedClass) return;

    const activity = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: actionType,
      classId: selectedClass.id,
      className: selectedClass.name,
      classCode: selectedClass.code,
      createdAt: new Date().toISOString()
    };

    const existing = JSON.parse(localStorage.getItem(ACTIVITY_STORAGE_KEY) || "[]");

    const next = [activity, ...existing].slice(0, 5);

    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(ACTIVITY_EVENT));
  }

  async function loadSession() {
    if (!selectedClass) return;

    const { data, error } = await supabase
      .from("sessions")
      .select("id, class_id, is_active, started_at, ended_at")
      .eq("class_id", selectedClass.id)
      .order("started_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement séance :", error);
      setActiveSession(null);
      return;
    }

    const active = (data || []).find((s) => s.is_active === true) || null;
    setActiveSession(active);
  }

  async function handleOpenSession() {
    if (!selectedClass || loadingAction) return;

    setFeedback({ type: "", text: "" });
    setLoadingAction("open");

    const { error: closeExistingError } = await supabase
      .from("sessions")
      .update({
        is_active: false,
        ended_at: new Date().toISOString()
      })
      .eq("class_id", selectedClass.id)
      .eq("is_active", true);

    if (closeExistingError) {
      console.error(closeExistingError);
      setFeedback({
        type: "error",
        text: "Impossible de préparer l'ouverture de la séance."
      });
      setLoadingAction("");
      return;
    }

    const { error: insertError } = await supabase
      .from("sessions")
      .insert({
        class_id: selectedClass.id,
        is_active: true,
        started_at: new Date().toISOString()
      });

    if (insertError) {
      console.error(insertError);
      setFeedback({
        type: "error",
        text: "Impossible d'ouvrir la séance."
      });
      setLoadingAction("");
      return;
    }

    pushActivity("open");
    await loadSession();

    setFeedback({
      type: "success",
      text: "La séance est maintenant ouverte."
    });

    setLoadingAction("");
  }

  async function handleCloseSession() {
    if (!activeSession || loadingAction) return;

    setFeedback({ type: "", text: "" });
    setLoadingAction("close");

    const { error } = await supabase
      .from("sessions")
      .update({
        is_active: false,
        ended_at: new Date().toISOString()
      })
      .eq("id", activeSession.id);

    if (error) {
      console.error(error);
      setFeedback({
        type: "error",
        text: "Impossible de fermer la séance."
      });
      setLoadingAction("");
      return;
    }

    pushActivity("close");
    await loadSession();

    setFeedback({
      type: "success",
      text: "La séance a été fermée."
    });

    setLoadingAction("");
  }

  async function confirmResetVotes() {
    if (!activeSession || loadingAction) return;

    setFeedback({ type: "", text: "" });
    setLoadingAction("reset");

    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("session_id", activeSession.id);

    if (error) {
      console.error(error);
      setFeedback({
        type: "error",
        text: "Impossible de réinitialiser les votes."
      });
      setLoadingAction("");
      return;
    }

    pushActivity("reset");
    setShowResetModal(false);
    await loadSession();

    setFeedback({
      type: "success",
      text: "Les votes ont été réinitialisés."
    });

    setLoadingAction("");
  }

  if (!selectedClass) {
    return (
      <div className="admin-panel">
        <h2>Gestion de la classe</h2>
        <p>Sélectionne une classe pour gérer la séance.</p>
      </div>
    );
  }

  return (
    <>
      <div className="admin-panel admin-management-panel">
        <div className="admin-panel-header admin-management-header">
          <h2>Gestion de la classe</h2>

          <span className={`admin-class-status ${activeSession ? "open" : "closed"}`}>
            {activeSession ? "séance ouverte" : "séance fermée"}
          </span>
        </div>

        {feedback.text && (
          <div className={`admin-inline-feedback ${feedback.type}`}>
            {feedback.text}
          </div>
        )}

        <div className="admin-management-grid">
          <div className="admin-management-card">
            <span className="admin-management-label">Nom</span>
            <strong>{selectedClass.name}</strong>
          </div>

          <div className="admin-management-card">
            <span className="admin-management-label">Code</span>
            <strong>{selectedClass.code}</strong>
          </div>

          <div className="admin-management-card">
            <span className="admin-management-label">Slug</span>
            <strong>{selectedClass.slug}</strong>
          </div>
        </div>

        <div className="admin-session-actions">

          <button
            type="button"
            className="admin-action-button admin-action-button-primary"
            onClick={handleOpenSession}
            disabled={loadingAction !== "" || !!activeSession}
          >
            <span className="admin-action-button-icon">▶</span>
            <span className="admin-action-button-title">
              {loadingAction === "open" ? "Ouverture..." : "Ouvrir la séance"}
            </span>
          </button>

          <button
            type="button"
            className="admin-action-button admin-action-button-secondary"
            onClick={handleCloseSession}
            disabled={loadingAction !== "" || !activeSession}
          >
            <span className="admin-action-button-icon">■</span>
            <span className="admin-action-button-title">
              {loadingAction === "close" ? "Fermeture..." : "Fermer la séance"}
            </span>
          </button>

          <button
            type="button"
            className="admin-action-button admin-action-button-danger"
            onClick={() => setShowResetModal(true)}
            disabled={loadingAction !== "" || !activeSession}
          >
            <span className="admin-action-button-icon">↻</span>
            <span className="admin-action-button-title">
              {loadingAction === "reset"
                ? "Réinitialisation..."
                : "Réinitialiser les votes"}
            </span>
          </button>

        </div>
      </div>

      {showResetModal && (
        <div
          className="admin-modal-backdrop"
          onClick={() => {
            if (!loadingAction) setShowResetModal(false);
          }}
        >
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Réinitialiser les votes</h3>

            <p>
              Cette action supprime tous les votes de la séance active pour la classe{" "}
              <strong>{selectedClass.name}</strong>.
            </p>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => setShowResetModal(false)}
                disabled={loadingAction === "reset"}
              >
                Annuler
              </button>

              <button
                type="button"
                className="admin-danger-button"
                onClick={confirmResetVotes}
                disabled={loadingAction === "reset"}
              >
                {loadingAction === "reset"
                  ? "Réinitialisation..."
                  : "Confirmer la réinitialisation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SessionControls;