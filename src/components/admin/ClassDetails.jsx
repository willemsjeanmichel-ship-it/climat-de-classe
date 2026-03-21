import { useState } from "react";
import { supabase } from "../../services/supabaseClient";
import SessionControls from "./SessionControls";
import AdvancedActions from "./AdvancedActions";
import HistoryPanel from "./HistoryPanel";

function ClassDetails({ selectedClass }) {
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function handleCreateClass(event) {
    event.preventDefault();

    const name = className.trim();
    const code = classCode.trim();

    if (!name) {
      setFeedback("Le nom de la classe est obligatoire.");
      return;
    }

    setCreating(true);
    setFeedback("");

    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const finalCode =
      code || Math.random().toString(36).slice(2, 8).toUpperCase();

    const { error } = await supabase.from("classes").insert([
      {
        name,
        code: finalCode,
        slug,
      },
    ]);

    if (error) {
      console.error("Erreur création classe :", error);
      setFeedback("Impossible de créer la classe.");
      setCreating(false);
      return;
    }

    setClassName("");
    setClassCode("");
    setFeedback("Classe créée avec succès. Recharge la page ou sélectionne-la dans la liste.");
    setCreating(false);
  }

  if (!selectedClass) {
    return (
      <section className="admin-class-details">
        <div className="admin-panel admin-class-form">
          <h2>Créer une classe</h2>
          <p className="admin-empty">
            Crée une classe pour commencer une séance.
          </p>

          <form onSubmit={handleCreateClass}>
            <div className="admin-form-group">
              <label htmlFor="class-name">Nom de la classe</label>
              <input
                id="class-name"
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Ex. 5e Électricité"
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="class-code">Code de la classe (optionnel)</label>
              <input
                id="class-code"
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                placeholder="Ex. ELEC5"
              />
            </div>

            {feedback ? <p className="admin-empty">{feedback}</p> : null}

            <div className="admin-buttons-row">
              <button
                type="submit"
                className="admin-primary-button"
                disabled={creating}
              >
                {creating ? "Création..." : "Créer la classe"}
              </button>
            </div>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-class-details">
      <SessionControls selectedClass={selectedClass} />

      <div className="admin-details-row">
        <div className="admin-panel">
          <h2>Options</h2>
          <div className="admin-options-empty">
            <p>Aucune option disponible pour le moment</p>
          </div>
        </div>

        <AdvancedActions selectedClass={selectedClass} />
      </div>

      <HistoryPanel selectedClass={selectedClass} />
    </section>
  );
}

export default ClassDetails;