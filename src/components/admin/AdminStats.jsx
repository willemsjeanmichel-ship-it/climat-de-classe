import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabaseClient";

function formatDate(value) {
  if (!value) return "Date inconnue";

  return new Date(value).toLocaleString("fr-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function AdminStats() {
  const [stats, setStats] = useState({
    classes: 0,
    sessions: 0,
    votes: 0,
    messages: 0,
    alerts: 0
  });

  const [messagesOpen, setMessagesOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  const [voteMessages, setVoteMessages] = useState([]);
  const [reports, setReports] = useState([]);

  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [deletingReportId, setDeletingReportId] = useState(null);

  const loadStats = useCallback(async () => {
    const [
      classesResult,
      sessionsResult,
      votesResult,
      messagesResult,
      alertsResult
    ] = await Promise.all([
      supabase
        .from("classes")
        .select("id", { count: "exact", head: true }),

      supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),

      supabase
        .from("votes")
        .select("id", { count: "exact", head: true }),

      supabase
        .from("votes")
        .select("id", { count: "exact", head: true })
        .not("message", "is", null),

      supabase
        .from("problem_reports")
        .select("id", { count: "exact", head: true })
    ]);

    if (
      classesResult.error ||
      sessionsResult.error ||
      votesResult.error ||
      messagesResult.error ||
      alertsResult.error
    ) {
      console.error("Erreur chargement stats admin :", {
        classes: classesResult.error,
        sessions: sessionsResult.error,
        votes: votesResult.error,
        messages: messagesResult.error,
        alerts: alertsResult.error
      });
      return;
    }

    setStats({
      classes: classesResult.count || 0,
      sessions: sessionsResult.count || 0,
      votes: votesResult.count || 0,
      messages: messagesResult.count || 0,
      alerts: alertsResult.count || 0
    });
  }, []);

  const loadVoteMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from("votes")
      .select(`
        id,
        message,
        created_at,
        weather_type,
        session_id,
        sessions (
          id,
          class_id,
          classes (
            id,
            name,
            code
          )
        )
      `)
      .not("message", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement messages élèves :", error);
      return;
    }

    const cleaned = (data || []).filter((item) => item.message?.trim());
    setVoteMessages(cleaned);
  }, []);

  const loadReports = useCallback(async () => {
    const { data, error } = await supabase
      .from("problem_reports")
      .select("id, student_name, class_name, message, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement signalements :", error);
      return;
    }

    setReports(data || []);
  }, []);

  async function handleDeleteMessage(messageId) {
    if (!messageId || deletingMessageId) return;

    setDeletingMessageId(messageId);

    const { error } = await supabase
      .from("votes")
      .update({ message: null })
      .eq("id", messageId);

    if (error) {
      console.error("Erreur suppression message :", error);
      setDeletingMessageId(null);
      return;
    }

    await Promise.all([loadStats(), loadVoteMessages()]);
    setDeletingMessageId(null);
  }

  async function handleDeleteReport(reportId) {
    if (!reportId || deletingReportId) return;

    setDeletingReportId(reportId);

    const { error } = await supabase
      .from("problem_reports")
      .delete()
      .eq("id", reportId);

    if (error) {
      console.error("Erreur suppression signalement :", error);
      setDeletingReportId(null);
      return;
    }

    await Promise.all([loadStats(), loadReports()]);
    setDeletingReportId(null);
  }

  useEffect(() => {
    let isMounted = true;

    async function safeRefreshAll() {
      if (!isMounted) return;
      await Promise.all([loadStats(), loadVoteMessages(), loadReports()]);
    }

    safeRefreshAll();

    const channel = supabase
      .channel("admin-stats-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "classes" },
        safeRefreshAll
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        safeRefreshAll
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        safeRefreshAll
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "problem_reports" },
        safeRefreshAll
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          safeRefreshAll();
        }
      });

    const interval = setInterval(() => {
      safeRefreshAll();
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [loadStats, loadVoteMessages, loadReports]);

  const messagesCount = useMemo(() => voteMessages.length, [voteMessages]);
  const reportsCount = useMemo(() => reports.length, [reports]);

  return (
    <>
      <section className="admin-stats">
        <div className="admin-stat-bubble">
          <div className="admin-stat-item">
            <span className="admin-stat-icon">🎓</span>
            <div className="admin-stat-text">
              <strong>{stats.classes}</strong>
              <p>Classes</p>
            </div>
          </div>

          <div className="admin-stat-item">
            <span className="admin-stat-icon">📅</span>
            <div className="admin-stat-text">
              <strong>{stats.sessions}</strong>
              <p>Séances actives</p>
            </div>
          </div>

          <div className="admin-stat-item">
            <span className="admin-stat-icon">👍</span>
            <div className="admin-stat-text">
              <strong>{stats.votes}</strong>
              <p>Votes</p>
            </div>
          </div>

          <button
            type="button"
            className="admin-stat-item admin-stat-item-button"
            onClick={() => setMessagesOpen(true)}
          >
            <span className="admin-stat-icon">💬</span>
            <div className="admin-stat-text">
              <strong>{messagesCount}</strong>
              <p>Messages élèves</p>
            </div>
          </button>

          <button
            type="button"
            className="admin-stat-item admin-stat-item-button"
            onClick={() => setReportsOpen(true)}
          >
            <span className="admin-stat-icon">🚨</span>
            <div className="admin-stat-text">
              <strong>{reportsCount}</strong>
              <p>Signalements</p>
            </div>
          </button>
        </div>
      </section>

      {messagesOpen && (
        <div
          className="admin-overlay"
          onClick={() => {
            if (!deletingMessageId) setMessagesOpen(false);
          }}
        >
          <div
            className="admin-overlay-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-overlay-header">
              <div>
                <h2>Messages élèves</h2>
                <p>{messagesCount} message(s)</p>
              </div>

              <button
                type="button"
                className="admin-overlay-close"
                onClick={() => setMessagesOpen(false)}
                disabled={!!deletingMessageId}
              >
                ✕
              </button>
            </div>

            <div className="admin-report-list">
              {voteMessages.length === 0 && (
                <div className="admin-report-empty">
                  Aucun message élève pour le moment.
                </div>
              )}

              {voteMessages.map((item) => {
                const classInfo = item.sessions?.classes;
                const className = classInfo?.name || "Classe inconnue";
                const classCode = classInfo?.code || "—";

                return (
                  <article key={item.id} className="admin-report-card">
                    <div className="admin-report-top">
                      <div>
                        <strong>{className}</strong>
                        <p className="admin-report-meta">
                          Code : {classCode} • Météo : {item.weather_type || "—"}
                        </p>
                      </div>

                      <div className="admin-report-actions">
                        <span className="admin-history-date">
                          {formatDate(item.created_at)}
                        </span>

                        <button
                          type="button"
                          className="admin-report-delete"
                          onClick={() => handleDeleteMessage(item.id)}
                          disabled={deletingMessageId === item.id}
                          title="Supprimer le message"
                        >
                          {deletingMessageId === item.id ? "…" : "×"}
                        </button>
                      </div>
                    </div>

                    <div className="admin-report-body">
                      {item.message}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {reportsOpen && (
        <div
          className="admin-overlay"
          onClick={() => {
            if (!deletingReportId) setReportsOpen(false);
          }}
        >
          <div
            className="admin-overlay-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-overlay-header">
              <div>
                <h2>Signalements</h2>
                <p>{reportsCount} signalement(s)</p>
              </div>

              <button
                type="button"
                className="admin-overlay-close"
                onClick={() => setReportsOpen(false)}
                disabled={!!deletingReportId}
              >
                ✕
              </button>
            </div>

            <div className="admin-report-list">
              {reports.length === 0 && (
                <div className="admin-report-empty">
                  Aucun signalement pour le moment.
                </div>
              )}

              {reports.map((item) => (
                <article key={item.id} className="admin-report-card">
                  <div className="admin-report-top">
                    <div>
                      <strong>{item.student_name || "Élève inconnu"}</strong>
                      <p className="admin-report-meta">
                        Classe : {item.class_name || "Non précisée"}
                      </p>
                    </div>

                    <div className="admin-report-actions">
                      <span className="admin-history-date">
                        {formatDate(item.created_at)}
                      </span>

                      <button
                        type="button"
                        className="admin-report-delete"
                        onClick={() => handleDeleteReport(item.id)}
                        disabled={deletingReportId === item.id}
                        title="Supprimer le signalement"
                      >
                        {deletingReportId === item.id ? "…" : "×"}
                      </button>
                    </div>
                  </div>

                  <div className="admin-report-body">
                    {item.message}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminStats;