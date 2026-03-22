import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import "../styles/student.css";

function ProblemReportPage() {
  const location = useLocation();
  const slug = location.state?.slug;

  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!name || !className || !message) {
      alert("Merci de remplir tous les champs.");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("problem_reports")
      .insert({
        student_name: name,
        class_name: className,
        message: message
      });

    if (error) {
      console.error(error);
      alert("Erreur lors de l'envoi.");
      setLoading(false);
      return;
    }

    alert("Message envoyé.");
    setName("");
    setClassName("");
    setMessage("");
    setLoading(false);
  }

  return (
    <div className="student-page">
      <div className="student-card student-problem-card">
        <h1 className="student-title">Signaler un problème</h1>

        <form onSubmit={handleSubmit} className="student-problem-form">
          <div className="student-problem-grid">
            <input
              type="text"
              placeholder="Nom et prénom"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              type="text"
              placeholder="Ta classe"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
          </div>

          <textarea
            placeholder="Explique le problème... (Sois précis)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <button
            type="submit"
            className="send-button send-button-danger"
            disabled={loading}
          >
            {loading ? "Envoi..." : "Signaler le problème"}
          </button>
        </form>

        {/* BOUTON RETOUR (hors form) */}
        <Link
          to={slug ? `/vote/${slug}` : "/"}
          className="student-button student-return-button"
        >
          Retour
        </Link>

        {/* TEXTE EN DESSOUS */}
        <p className="student-problem-info">
          ℹ️ Si tu as un problème avec ton professeur, parle-en avec un éducateur.
        </p>
      </div>
    </div>
  );
}

export default ProblemReportPage;