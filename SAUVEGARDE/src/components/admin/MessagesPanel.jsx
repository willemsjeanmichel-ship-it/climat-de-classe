import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";

function MessagesPanel({ selectedClass }) {

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {

    if (!selectedClass) return;

    loadMessages();

  }, [selectedClass]);

  async function loadMessages() {

    setLoading(true);

    const { data: session } = await supabase
      .from("sessions")
      .select("id")
      .eq("class_id", selectedClass.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!session) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("votes")
      .select("message,created_at")
      .eq("session_id", session.id)
      .not("message", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement messages:", error);
      setLoading(false);
      return;
    }

    setMessages(data || []);
    setLoading(false);

  }

  if (!selectedClass) {

    return (
      <div className="admin-panel">
        <h2>Messages</h2>
        <p>Sélectionne une classe pour voir les messages.</p>
      </div>
    );

  }

  return (

    <div className="admin-panel">

      <h2>Messages</h2>

      {loading && (
        <p>Chargement des messages...</p>
      )}

      {!loading && messages.length === 0 && (
        <p>Aucun message pour cette séance.</p>
      )}

      {!loading && messages.length > 0 && (

        <div className="admin-messages-list">

          {messages.map((msg, index) => (

            <div
              key={index}
              className="admin-message-item"
            >

              <p>{msg.message}</p>

              <span className="admin-message-date">
                {new Date(msg.created_at).toLocaleTimeString()}
              </span>

            </div>

          ))}

        </div>

      )}

    </div>

  );

}

export default MessagesPanel;