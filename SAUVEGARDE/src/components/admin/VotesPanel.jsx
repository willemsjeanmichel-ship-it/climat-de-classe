import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";

function VotesPanel({ selectedClass }) {
  const [votes, setVotes] = useState({
    sun: 0,
    cloud: 0,
    rain: 0,
    storm: 0,
    total: 0
  });

  const [loading, setLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);

  useEffect(() => {
    if (!selectedClass) {
      setActiveSessionId(null);
      setVotes({
        sun: 0,
        cloud: 0,
        rain: 0,
        storm: 0,
        total: 0
      });
      return;
    }

    let isMounted = true;

    async function init() {
      await loadVotes(isMounted);
    }

    init();

    const sessionChannel = supabase
      .channel(`admin-sessions-${selectedClass.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `class_id=eq.${selectedClass.id}`
        },
        () => {
          loadVotes(true);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(sessionChannel);
    };
  }, [selectedClass]);

  useEffect(() => {
    if (!activeSessionId) return;

    const votesChannel = supabase
      .channel(`admin-votes-${activeSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
          filter: `session_id=eq.${activeSessionId}`
        },
        () => {
          loadVotes(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(votesChannel);
    };
  }, [activeSessionId]);

  async function loadVotes(allowUpdate = true) {
    if (!selectedClass) return;

    setLoading(true);

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id")
      .eq("class_id", selectedClass.id)
      .eq("is_active", true)
      .maybeSingle();

    if (sessionError || !session) {
      if (allowUpdate) {
        setActiveSessionId(null);
        setVotes({
          sun: 0,
          cloud: 0,
          rain: 0,
          storm: 0,
          total: 0
        });
      }
      setLoading(false);
      return;
    }

    if (allowUpdate) {
      setActiveSessionId(session.id);
    }

    const { data, error } = await supabase
      .from("votes")
      .select("vote")
      .eq("session_id", session.id);

    if (error) {
      console.error("Erreur chargement votes :", error);
      setLoading(false);
      return;
    }

    const counts = {
      sun: 0,
      cloud: 0,
      rain: 0,
      storm: 0
    };

    (data || []).forEach((item) => {
      if (counts[item.vote] !== undefined) {
        counts[item.vote] += 1;
      }
    });

    if (allowUpdate) {
      setVotes({
        ...counts,
        total: (data || []).length
      });
    }

    setLoading(false);
  }

  if (!selectedClass) {
    return (
      <div className="admin-panel">
        <h2>Votes</h2>
        <p>Sélectionne une classe pour voir les votes.</p>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2>Votes en temps réel</h2>
      </div>

      {loading && <p>Chargement des votes...</p>}

      {!loading && (
        <>
          <div className="admin-votes-grid">
            <div>☀️ Soleil : {votes.sun}</div>
            <div>⛅ Nuage : {votes.cloud}</div>
            <div>🌧 Pluie : {votes.rain}</div>
            <div>🌩 Orage : {votes.storm}</div>
          </div>

          <p style={{ marginTop: "12px" }}>
            Total : <strong>{votes.total}</strong>
          </p>
        </>
      )}
    </div>
  );
}

export default VotesPanel;