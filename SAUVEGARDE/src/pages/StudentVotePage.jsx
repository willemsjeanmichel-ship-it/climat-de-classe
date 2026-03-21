import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import "../styles/student.css";

const WEATHER_OPTIONS = [
  {
    key: "sun",
    emoji: "☀️",
    label: "Soleil",
    description: "Je me sens bien dans la classe."
  },
  {
    key: "cloud",
    emoji: "⛅",
    label: "Nuage",
    description: "Ça va, mais ce n’est pas parfait."
  },
  {
    key: "rain",
    emoji: "🌧️",
    label: "Pluie",
    description: "Je me sens moins bien aujourd’hui."
  },
  {
    key: "storm",
    emoji: "⛈️",
    label: "Orage",
    description: "Je vis quelque chose de difficile."
  }
];

const MESSAGE_MAX_LENGTH = 500;

function generateDeviceToken() {
  let token = localStorage.getItem("climat_device_token");

  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem("climat_device_token", token);
  }

  return token;
}

function StudentVotePage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [selectedWeather, setSelectedWeather] = useState(null);
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [className, setClassName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  const messageLength = message.length;
  const messageTooLong = messageLength > MESSAGE_MAX_LENGTH;

  const selectedOption = useMemo(
    () => WEATHER_OPTIONS.find((item) => item.key === selectedWeather),
    [selectedWeather]
  );

  useEffect(() => {
    async function loadSession() {
      setError("");
      setPageLoading(true);

      const deviceToken = generateDeviceToken();

      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("id, name, slug")
        .eq("slug", slug)
        .maybeSingle();

      if (classError || !classData) {
        setError("Classe introuvable.");
        setPageLoading(false);
        return;
      }

      setClassName(classData.name || "");

      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select("id, is_active, started_at")
        .eq("class_id", classData.id)
        .order("started_at", { ascending: false });

      if (sessionsError || !sessionsData || sessionsData.length === 0) {
        setError("Aucune séance active.");
        setPageLoading(false);
        return;
      }

      const activeSession = sessionsData.find((session) => session.is_active === true);

      if (!activeSession) {
        setError("Aucune séance active.");
        setPageLoading(false);
        return;
      }

      setSessionId(activeSession.id);

      const { data: existingVote, error: voteError } = await supabase
        .from("votes")
        .select("id")
        .eq("session_id", activeSession.id)
        .eq("device_token", deviceToken)
        .maybeSingle();

      if (!voteError && existingVote) {
        navigate(`/deja-vote?slug=${slug}`);
        return;
      }

      setPageLoading(false);
    }

    loadSession();
  }, [slug, navigate]);

  async function insertVoteWithFallback(payload) {
    const firstTry = await supabase.from("votes").insert(payload);

    if (!firstTry.error) {
      return { success: true };
    }

    console.error("Erreur envoi vote détaillée :", {
      message: firstTry.error?.message,
      details: firstTry.error?.details,
      hint: firstTry.error?.hint,
      code: firstTry.error?.code
    });

    const fallbackPayload = {
      session_id: payload.session_id,
      weather_type: payload.weather_type,
      device_token: payload.device_token
    };

    const secondTry = await supabase.from("votes").insert(fallbackPayload);

    if (!secondTry.error) {
      return { success: true, fallbackUsed: true };
    }

    console.error("Erreur fallback vote :", {
      message: secondTry.error?.message,
      details: secondTry.error?.details,
      hint: secondTry.error?.hint,
      code: secondTry.error?.code
    });

    return { success: false, error: secondTry.error };
  }

  async function handleSubmit() {
    if (!selectedWeather) {
      setError("Choisis une météo avant d'envoyer.");
      return;
    }

    if (!sessionId) {
      setError("Aucune séance active.");
      return;
    }

    if (messageTooLong) {
      setError(`Le message ne peut pas dépasser ${MESSAGE_MAX_LENGTH} caractères.`);
      return;
    }

    setLoading(true);
    setError("");

    const deviceToken = generateDeviceToken();
    const cleanMessage = message.trim();

    const result = await insertVoteWithFallback({
      session_id: sessionId,
      weather_type: selectedWeather,
      device_token: deviceToken,
      message: cleanMessage || null
    });

    if (!result.success) {
      if (result.error?.code === "23505") {
        navigate(`/deja-vote?slug=${slug}`);
        return;
      }

      setError("Impossible d'envoyer le vote.");
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate("/merci");
  }

  if (pageLoading) {
    return (
      <div className="student-page">
        <div className="student-card student-vote-card">
          <h1 className="student-title">Climat de classe</h1>
          <p className="student-subtitle">Chargement de la séance...</p>
        </div>
      </div>
    );
  }

  if (error && !sessionId) {
    return (
      <div className="student-page">
        <div className="student-card student-vote-card">
          <h1 className="student-title">Climat de classe</h1>
          <p className="student-subtitle">{error}</p>

          <div className="student-action">
            <Link to="/probleme" className="student-button">
              Signaler un problème
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="student-page">
      <div className="student-card student-vote-card">
        <div className="student-vote-header">
          <h1 className="student-title">Climat de classe</h1>

          <p className="student-text">
            Comment te sens-tu dans la classe aujourd’hui ?
          </p>
        </div>

        <div className="student-weather-grid">
          {WEATHER_OPTIONS.map((option) => {
            const isSelected = selectedWeather === option.key;

            return (
              <button
                key={option.key}
                type="button"
                className={`student-weather-card ${isSelected ? "selected" : ""}`}
                onClick={() => setSelectedWeather(option.key)}
                disabled={loading}
              >
                <span className="student-weather-emoji">{option.emoji}</span>
                <span className="student-weather-title">{option.label}</span>
                <span className="student-weather-description">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>

        <div className="student-vote-message-block">
          <label htmlFor="student-message" className="student-vote-label">
          </label>

          <textarea
            id="student-message"
            className="student-vote-textarea"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (error) setError("");
            }}
            placeholder="Un souci ? Partage le avec la classe..."
            disabled={loading}
            maxLength={MESSAGE_MAX_LENGTH}
          />
        </div>

        {selectedOption && (
          <div className="student-vote-selected">
            <span>Météo choisie :</span>
            <strong>
              {selectedOption.emoji} {selectedOption.label}
            </strong>
          </div>
        )}

        {error && (
          <p className="feedback-text feedback-error">
            {error}
          </p>
        )}

        <div className="student-vote-actions">
          <button
            type="button"
            className="send-button"
            onClick={handleSubmit}
            disabled={loading || messageTooLong}
          >
            {loading ? "Envoi en cours..." : "Envoyer mon vote"}
          </button>

          <Link to="/probleme" className="student-button student-secondary-action">
            Un problème plus grave ?
          </Link>
        </div>
      </div>
    </div>
  );
}

export default StudentVotePage;