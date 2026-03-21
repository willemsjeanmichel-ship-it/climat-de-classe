import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from "recharts";
import { supabase } from "../services/supabaseClient";
import "../styles/statistics.css";

const WEATHER_ORDER = ["sun", "cloud", "rain", "storm"];

const WEATHER_META = {
  sun: {
    key: "sun",
    emoji: "☀️",
    label: "Soleil",
    color: "#facc15",
    cardClass: "sun"
  },
  cloud: {
    key: "cloud",
    emoji: "⛅",
    label: "Nuage",
    color: "#cbd5e1",
    cardClass: "cloud"
  },
  rain: {
    key: "rain",
    emoji: "🌧️",
    label: "Pluie",
    color: "#60a5fa",
    cardClass: "rain"
  },
  storm: {
    key: "storm",
    emoji: "⛈️",
    label: "Orage",
    color: "#64748b",
    cardClass: "storm"
  }
};

function formatSessionDate(value) {
  if (!value) return "Séance";

  return new Date(value).toLocaleDateString("fr-BE", {
    day: "2-digit",
    month: "2-digit"
  });
}

function getEmptyStats() {
  return {
    sun: 0,
    cloud: 0,
    rain: 0,
    storm: 0,
    total: 0
  };
}

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0].payload;

  return (
    <div className="statistics-tooltip">
      <strong>{item.name}</strong>
      <span>{item.value} vote(s)</span>
      <span>{item.percent}%</span>
    </div>
  );
}

function StatisticsPage() {
  const [classes, setClasses] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [stats, setStats] = useState(getEmptyStats());
  const [timelineData, setTimelineData] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadClasses();

    const classesChannel = supabase
      .channel("statistics-classes-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "classes" },
        loadClasses
      )
      .subscribe();

    return () => {
      supabase.removeChannel(classesChannel);
    };
  }, []);

  useEffect(() => {
    if (selectedSlug) {
      loadStatsForClass(selectedSlug);
    } else {
      setStats(getEmptyStats());
      setTimelineData([]);
    }
  }, [selectedSlug]);

  async function loadClasses() {
    setLoadingClasses(true);
    setError("");

    const { data, error } = await supabase
      .from("classes")
      .select("id, name, code, slug")
      .order("name");

    if (error) {
      console.error("Erreur chargement classes :", error);
      setError("Impossible de charger les classes.");
      setLoadingClasses(false);
      return;
    }

    const list = data || [];
    setClasses(list);

    if (list.length > 0) {
      setSelectedSlug((prev) => {
        const stillExists = list.some((item) => item.slug === prev);
        return stillExists ? prev : list[0].slug;
      });
    } else {
      setSelectedSlug("");
    }

    setLoadingClasses(false);
  }

  async function loadStatsForClass(slug) {
    setLoadingStats(true);
    setError("");

    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, name, code, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (classError || !classData) {
      console.error("Erreur chargement classe statistiques :", classError);
      setError("Impossible de charger la classe sélectionnée.");
      setLoadingStats(false);
      return;
    }

    const { data: sessionsData, error: sessionsError } = await supabase
      .from("sessions")
      .select("id, started_at")
      .eq("class_id", classData.id)
      .order("started_at", { ascending: true });

    if (sessionsError) {
      console.error("Erreur chargement séances :", sessionsError);
      setError("Impossible de charger les séances.");
      setLoadingStats(false);
      return;
    }

    const sessions = sessionsData || [];
    const sessionIds = sessions.map((session) => session.id);

    if (sessionIds.length === 0) {
      setStats(getEmptyStats());
      setTimelineData([]);
      setLoadingStats(false);
      return;
    }

    const { data: votesData, error: votesError } = await supabase
      .from("votes")
      .select("session_id, weather_type, created_at")
      .in("session_id", sessionIds);

    if (votesError) {
      console.error("Erreur chargement votes statistiques :", votesError);
      setError("Impossible de charger les votes.");
      setLoadingStats(false);
      return;
    }

    const votes = votesData || [];
    const counts = {
      sun: 0,
      cloud: 0,
      rain: 0,
      storm: 0
    };

    votes.forEach((vote) => {
      if (counts[vote.weather_type] !== undefined) {
        counts[vote.weather_type] += 1;
      }
    });

    const sessionVoteMap = {};
    sessions.forEach((session, index) => {
      sessionVoteMap[session.id] = {
        name: `S${index + 1}`,
        fullName: `Séance ${index + 1}`,
        dateLabel: formatSessionDate(session.started_at),
        sun: 0,
        cloud: 0,
        rain: 0,
        storm: 0,
        total: 0
      };
    });

    votes.forEach((vote) => {
      const row = sessionVoteMap[vote.session_id];
      if (!row) return;

      if (row[vote.weather_type] !== undefined) {
        row[vote.weather_type] += 1;
        row.total += 1;
      }
    });

    const timeline = sessions.map((session) => {
      const row = sessionVoteMap[session.id];
      const total = row.total || 1;

      return {
        name: row.name,
        fullName: row.fullName,
        dateLabel: row.dateLabel,
        sun: Math.round((row.sun / total) * 100),
        cloud: Math.round((row.cloud / total) * 100),
        rain: Math.round((row.rain / total) * 100),
        storm: Math.round((row.storm / total) * 100)
      };
    });

    setStats({
      ...counts,
      total: votes.length
    });

    setTimelineData(timeline);
    setLoadingStats(false);
  }

  const selectedClass = useMemo(() => {
    return classes.find((item) => item.slug === selectedSlug) || null;
  }, [classes, selectedSlug]);

  const chartData = useMemo(() => {
    const total = stats.total || 1;

    return WEATHER_ORDER.map((key) => ({
      ...WEATHER_META[key],
      value: stats[key],
      percent: Math.round((stats[key] / total) * 100)
    }));
  }, [stats]);

  const pieData = useMemo(() => {
    return chartData.map((item) => ({
      name: item.label,
      value: item.value,
      percent: item.percent,
      color: item.color
    }));
  }, [chartData]);

  return (
    <div className="statistics-page">
      <header className="statistics-hero">
        <div className="statistics-hero-bubble">
          <h1>Statistiques</h1>
        </div>
      </header>

      <section className="statistics-panel">
        <div className="statistics-toolbar">
          <div className="statistics-field">
            <label htmlFor="statistics-class-select" className="statistics-label">
              Choisir la classe
            </label>

            <select
              id="statistics-class-select"
              className="statistics-select"
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              disabled={loadingClasses || classes.length === 0}
            >
              {classes.length === 0 && (
                <option value="">
                  Aucune classe disponible
                </option>
              )}

              {classes.map((classe) => (
                <option key={classe.id} value={classe.slug}>
                  {classe.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="statistics-state statistics-state-error">{error}</p>
        )}

        {loadingClasses && (
          <p className="statistics-state">Chargement des classes...</p>
        )}

        {!loadingClasses && !error && selectedClass && (
          <div className="statistics-card">
            <div className="statistics-card-header">
            </div>

            {loadingStats ? (
              <p className="statistics-state">Chargement des statistiques...</p>
            ) : (
              <>
                <div className="statistics-top-summary">
                  <div className="statistics-total-card">
                    <span>Total des votes</span>
                    <strong>{stats.total}</strong>
                  </div>

                  <div className="statistics-compact-stats">
                    {chartData.map((item) => (
                      <article
                        key={item.key}
                        className={`statistics-mini-card statistics-${item.cardClass}`}
                      >
                        <div className="statistics-mini-top">
                          <span className="statistics-mini-emoji">{item.emoji}</span>
                          <span className="statistics-mini-label">{item.label}</span>
                        </div>

                        <strong className="statistics-mini-value">{item.value}</strong>
                        <span className="statistics-mini-percent">{item.percent}%</span>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="statistics-main-grid">
                  <div className="statistics-donut-card">
                    <div className="statistics-section-head">
                      <h3>Répartition globale</h3>
                      <p>Vue générale</p>
                    </div>

                    <div className="statistics-chart-wrap">
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={54}
                            outerRadius={90}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                          <Legend
                            verticalAlign="bottom"
                            align="center"
                            iconType="circle"
                            formatter={(value) => (
                              <span className="statistics-legend-text">{value}</span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="statistics-bars-card">
                    <div className="statistics-section-head">
                      <h3>Pourcentages</h3>
                      <p>Par type de vote</p>
                    </div>

                    <div className="statistics-bars-list">
                      {chartData.map((item) => (
                        <div key={item.key} className="statistics-bar-row">
                          <div className="statistics-bar-row-head">
                            <div className="statistics-bar-row-label">
                              <span className="statistics-bar-row-emoji">{item.emoji}</span>
                              <span>{item.label}</span>
                            </div>

                            <div className="statistics-bar-row-values">
                              <strong>{item.value}</strong>
                              <span>{item.percent}%</span>
                            </div>
                          </div>

                          <div className="statistics-bar-track statistics-bar-track-large">
                            <div
                              className={`statistics-bar-fill statistics-bar-fill-${item.key}`}
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="statistics-timeline-card">
                  <div className="statistics-section-head">
                    <h3>Évolution dans le temps</h3>
                    <p>% par séance</p>
                  </div>

                  {timelineData.length === 0 ? (
                    <p className="statistics-state">
                      Pas assez de données pour afficher l’évolution.
                    </p>
                  ) : (
                    <div className="statistics-line-wrap">
                      <ResponsiveContainer width="100%" height={270}>
                        <LineChart data={timelineData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                          <XAxis dataKey="dateLabel" />
                          <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                          <Tooltip
                            formatter={(value) => `${value}%`}
                            labelFormatter={(label, payload) => {
                              const item = payload?.[0]?.payload;
                              return item ? `${item.fullName} • ${item.dateLabel}` : label;
                            }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            align="center"
                            iconType="circle"
                            formatter={(value) => (
                              <span className="statistics-legend-text">{value}</span>
                            )}
                          />
                          <Line type="monotone" dataKey="sun" name="Soleil" stroke="#facc15" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="cloud" name="Nuage" stroke="#cbd5e1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="rain" name="Pluie" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="storm" name="Orage" stroke="#64748b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {!loadingClasses && !error && !selectedClass && classes.length === 0 && (
          <p className="statistics-state">
            Crée d’abord une classe pour afficher les statistiques.
          </p>
        )}
      </section>
    </div>
  );
}

export default StatisticsPage;