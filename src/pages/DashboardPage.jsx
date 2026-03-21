import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import "../styles/dashboard.css";

const WEATHER_META = {
  sun: {
    emoji: "☀️",
    label: "Soleil",
    description: "Climat très positif",
    className: "sun"
  },
  cloud: {
    emoji: "⛅",
    label: "Nuage",
    description: "Climat plutôt mitigé",
    className: "cloud"
  },
  rain: {
    emoji: "🌧️",
    label: "Pluie",
    description: "Climat fragile",
    className: "rain"
  },
  storm: {
    emoji: "⛈️",
    label: "Orage",
    description: "Climat tendu",
    className: "storm"
  }
};

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

function DashboardPage() {
  const { slug } = useParams();

  const [classInfo, setClassInfo] = useState(null);
  const [votes, setVotes] = useState({
    sun: 0,
    cloud: 0,
    rain: 0,
    storm: 0
  });
  const [total, setTotal] = useState(0);
  const [weather, setWeather] = useState("sun");
  const [floatingVotes, setFloatingVotes] = useState([]);
  const [isProjection, setIsProjection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeSessionId, setActiveSessionId] = useState(null);
  const [voteMessages, setVoteMessages] = useState([]);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState(null);

  const animationFrameRef = useRef(null);
  const lastTimeRef = useRef(0);

  const dominant = useMemo(() => {
    return WEATHER_META[weather] || WEATHER_META.sun;
  }, [weather]);

  const messageCount = useMemo(() => {
    return voteMessages.length;
  }, [voteMessages]);

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createFloatingVote(vote) {
    const meta = WEATHER_META[vote.weather_type] || WEATHER_META.sun;

    return {
      id: vote.id,
      emoji: meta.emoji,
      x: randomBetween(8, 92),
      y: randomBetween(12, 88),
      vx: randomBetween(-3.5, 3.5),
      vy: randomBetween(-2.4, 2.4),
      size: randomBetween(2.8, 4.8)
    };
  }

  function getDominantWeather(counts) {
    let nextWeather = "sun";

    if (counts.cloud > counts[nextWeather]) nextWeather = "cloud";
    if (counts.rain > counts[nextWeather]) nextWeather = "rain";
    if (counts.storm > counts[nextWeather]) nextWeather = "storm";

    return nextWeather;
  }

  async function loadVoteMessages(sessionId) {
    if (!sessionId) {
      setVoteMessages([]);
      return;
    }

    const { data, error: messagesError } = await supabase
      .from("votes")
      .select("id, message, weather_type, created_at")
      .eq("session_id", sessionId)
      .not("message", "is", null)
      .order("created_at", { ascending: false });

    if (messagesError) {
      console.error("Erreur chargement messages dashboard :", messagesError);
      return;
    }

    const cleaned = (data || []).filter((item) => item.message?.trim());
    setVoteMessages(cleaned);
  }

  async function handleDeleteMessage(messageId) {
    if (!messageId || deletingMessageId) return;

    setDeletingMessageId(messageId);

    const { error: updateError } = await supabase
      .from("votes")
      .update({ message: null })
      .eq("id", messageId);

    if (updateError) {
      console.error("Erreur suppression message :", updateError);
      setDeletingMessageId(null);
      return;
    }

    if (activeSessionId) {
      await loadVoteMessages(activeSessionId);
    }

    setDeletingMessageId(null);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("projection") === "1") {
      setIsProjection(true);
    }
  }, []);

  useEffect(() => {
    function animate(timestamp) {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const delta = Math.min((timestamp - lastTimeRef.current) / 1000, 0.033);
      lastTimeRef.current = timestamp;

      setFloatingVotes((prev) =>
        prev.map((item) => {
          let nextX = item.x + item.vx * delta;
          let nextY = item.y + item.vy * delta;
          let nextVx = item.vx;
          let nextVy = item.vy;

          if (nextX < 4 || nextX > 96) {
            nextVx *= -1;
            nextX = Math.max(4, Math.min(96, nextX));
          }

          if (nextY < 6 || nextY > 94) {
            nextVy *= -1;
            nextY = Math.max(6, Math.min(94, nextY));
          }

          return {
            ...item,
            x: nextX,
            y: nextY,
            vx: nextVx,
            vy: nextVy
          };
        })
      );

      animationFrameRef.current = window.requestAnimationFrame(animate);
    }

    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let sessionChannel = null;
    let votesChannel = null;
    let cancelled = false;

    function resetDashboard() {
      setVotes({ sun: 0, cloud: 0, rain: 0, storm: 0 });
      setTotal(0);
      setWeather("sun");
      setFloatingVotes([]);
      setActiveSessionId(null);
      setVoteMessages([]);
    }

    async function loadVotes(sessionId) {
      const { data, error: votesError } = await supabase
        .from("votes")
        .select("id, weather_type, created_at, message")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (votesError) {
        console.error("Erreur chargement votes :", votesError);
        return;
      }

      const counts = {
        sun: 0,
        cloud: 0,
        rain: 0,
        storm: 0
      };

      (data || []).forEach((vote) => {
        if (counts[vote.weather_type] !== undefined) {
          counts[vote.weather_type] += 1;
        }
      });

      if (cancelled) return;

      setVotes(counts);
      setTotal((data || []).length);
      setWeather(getDominantWeather(counts));
      setFloatingVotes((data || []).map((vote) => createFloatingVote(vote)));

      const cleanedMessages = (data || [])
        .filter((vote) => vote.message?.trim())
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setVoteMessages(cleanedMessages);
    }

    async function syncActiveSession(classId) {
      const { data, error: sessionsError } = await supabase
        .from("sessions")
        .select("id, is_active, started_at")
        .eq("class_id", classId)
        .order("started_at", { ascending: false });

      if (sessionsError) {
        console.error("Erreur chargement sessions :", sessionsError);
        return;
      }

      const activeSession = (data || []).find((session) => session.is_active === true);

      if (!activeSession) {
        resetDashboard();
        return;
      }

      setActiveSessionId(activeSession.id);
      await loadVotes(activeSession.id);
    }

    async function init() {
      setLoading(true);
      setError("");

      const { data: foundClass, error: classError } = await supabase
        .from("classes")
        .select("id, name, slug")
        .eq("slug", slug)
        .maybeSingle();

      if (classError) {
        console.error("Erreur chargement classe :", classError);
        if (!cancelled) {
          setError("Impossible de charger la classe.");
          setLoading(false);
        }
        return;
      }

      if (!foundClass) {
        if (!cancelled) {
          setError("Classe introuvable.");
          setLoading(false);
        }
        return;
      }

      if (cancelled) return;

      setClassInfo(foundClass);
      await syncActiveSession(foundClass.id);

      sessionChannel = supabase
        .channel(`dashboard-sessions-${foundClass.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "sessions",
            filter: `class_id=eq.${foundClass.id}`
          },
          () => {
            syncActiveSession(foundClass.id);
          }
        )
        .subscribe();

      votesChannel = supabase
        .channel(`dashboard-votes-${foundClass.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "votes"
          },
          () => {
            syncActiveSession(foundClass.id);
          }
        )
        .subscribe();

      if (!cancelled) {
        setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;

      if (sessionChannel) {
        supabase.removeChannel(sessionChannel);
      }

      if (votesChannel) {
        supabase.removeChannel(votesChannel);
      }
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="dashboard-page dashboard-sky dashboard-sky-sun">
        <div className="dashboard-shell">
          <div className="dashboard-title-bubble">
            <h1>Climat de classe</h1>
            <p>Chargement du tableau météo...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page dashboard-sky dashboard-sky-storm">
        <div className="dashboard-shell">
          <div className="dashboard-title-bubble">
            <h1>Climat de classe</h1>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`dashboard-page dashboard-sky dashboard-sky-${dominant.className} ${
        isProjection ? "dashboard-projection" : ""
      }`}
    >
      <div className="dashboard-floating-layer" aria-hidden="true">
        {floatingVotes.map((item) => (
          <span
            key={item.id}
            className="dashboard-floating-vote"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              fontSize: `${item.size}rem`,
              transform: "translate(-50%, -50%)"
            }}
          >
            {item.emoji}
          </span>
        ))}
      </div>

      <div className="dashboard-shell">
        <header className="dashboard-title-bubble">
          <div className="dashboard-title-top">
            <div>
              <h1>Climat de classe</h1>
              <p className="dashboard-subtitle">
                {classInfo?.name ? `Classe : ${classInfo.name}` : "Classe"}
              </p>
            </div>

            <div className="dashboard-top-pills">
              <div className="dashboard-total-pill">
                <span>Total votes</span>
                <strong>{total}</strong>
              </div>

              <button
                type="button"
                className="dashboard-total-pill dashboard-message-pill"
                onClick={() => setMessagesOpen(true)}
              >
                <span>Messages</span>
                <strong>{messageCount}</strong>
              </button>
            </div>
          </div>
        </header>

        <section className="dashboard-main-card">
          <div className="dashboard-dominant-panel">
            <div className={`dashboard-main-weather dashboard-main-weather-${dominant.className}`}>
              <div className="dashboard-main-weather-emoji">{dominant.emoji}</div>
              <div className="dashboard-main-weather-text">
                <span className="dashboard-main-weather-label">{dominant.label}</span>
                <strong className="dashboard-main-weather-value">{total}</strong>
                <p className="dashboard-main-weather-desc">{dominant.description}</p>
              </div>
            </div>
          </div>

          <div className="dashboard-stats-grid">
            <article className="stat-item stat-sun">
              <div className="stat-head">
                <span className="stat-emoji">☀️</span>
                <span className="stat-label">Soleil</span>
              </div>
              <strong>{votes.sun}</strong>
            </article>

            <article className="stat-item stat-cloud">
              <div className="stat-head">
                <span className="stat-emoji">⛅</span>
                <span className="stat-label">Nuage</span>
              </div>
              <strong>{votes.cloud}</strong>
            </article>

            <article className="stat-item stat-rain">
              <div className="stat-head">
                <span className="stat-emoji">🌧️</span>
                <span className="stat-label">Pluie</span>
              </div>
              <strong>{votes.rain}</strong>
            </article>

            <article className="stat-item stat-storm">
              <div className="stat-head">
                <span className="stat-emoji">⛈️</span>
                <span className="stat-label">Orage</span>
              </div>
              <strong>{votes.storm}</strong>
            </article>
          </div>
        </section>
      </div>

      {messagesOpen && (
        <div
          className="dashboard-overlay"
          onClick={() => {
            if (!deletingMessageId) setMessagesOpen(false);
          }}
        >
          <div
            className="dashboard-overlay-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dashboard-overlay-header">
              <div>
                <h2>Messages élèves</h2>
                <p>{messageCount} message(s) pour la séance active</p>
              </div>

              <button
                type="button"
                className="dashboard-overlay-close"
                onClick={() => setMessagesOpen(false)}
                disabled={!!deletingMessageId}
              >
                ✕
              </button>
            </div>

            <div className="dashboard-message-list">
              {voteMessages.length === 0 && (
                <div className="dashboard-message-empty">
                  Aucun message pour la séance active.
                </div>
              )}

              {voteMessages.map((item) => (
                <article key={item.id} className="dashboard-message-card">
                  <div className="dashboard-message-card-top">
                    <div className="dashboard-message-badge">
                      {WEATHER_META[item.weather_type]?.emoji || "💬"}{" "}
                      {WEATHER_META[item.weather_type]?.label || "Message"}
                    </div>

                    <div className="dashboard-message-actions">
                      <span className="dashboard-message-date">
                        {formatDate(item.created_at)}
                      </span>

                      <button
                        type="button"
                        className="dashboard-delete-button"
                        onClick={() => handleDeleteMessage(item.id)}
                        disabled={deletingMessageId === item.id}
                        title="Supprimer le message"
                      >
                        {deletingMessageId === item.id ? "…" : "×"}
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-message-body">
                    {item.message}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;