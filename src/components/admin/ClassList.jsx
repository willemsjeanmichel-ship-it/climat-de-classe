import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateClassCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function ClassList({ onSelectClass, selectedClass, onDeleteClass, deleting }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState("");
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    fetchClasses();
  }, []);

  async function fetchClasses() {
    setLoading(true);

    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Erreur chargement classes :", error);
      setLoading(false);
      return;
    }

    setClasses(data || []);
    setLoading(false);
  }

  async function handleCreateClass(event) {
    event.preventDefault();

    const name = className.trim();

    if (!name) {
      setFeedback("Le nom de la classe est obligatoire.");
      return;
    }

    setCreating(true);
    setFeedback("");

    const slug = slugify(name);
    const code = generateClassCode();

    const { data, error } = await supabase
      .from("classes")
      .insert([
        {
          name,
          code,
          slug,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Erreur création classe :", error);
      setFeedback("Impossible de créer la classe.");
      setCreating(false);
      return;
    }

    setClassName("");
    setFeedback("Classe créée avec succès.");

    setClasses((prev) => {
      const next = [...prev, data];
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });

    onSelectClass(data);
    setCreating(false);
  }

  return (
    <aside className="admin-class-list">
      <div className="admin-panel-header">
        <h2>Classes</h2>
      </div>

      <form className="admin-class-form" onSubmit={handleCreateClass}>
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

      {loading ? (
        <p className="admin-loading">Chargement des classes...</p>
      ) : classes.length === 0 ? (
        <p className="admin-empty">Aucune classe pour le moment.</p>
      ) : (
        <div className="admin-class-items">
          {classes.map((item) => (
            <div key={item.id} className="admin-class-item-wrapper">
              <button
                type="button"
                className={`admin-class-item ${
                  selectedClass?.id === item.id ? "active" : ""
                }`}
                onClick={() => onSelectClass(item)}
              >
                <div>
                  <strong>{item.name}</strong>
                  <p>Code : {item.code}</p>
                </div>
              </button>

              <button
                type="button"
                className="admin-class-delete-button"
                onClick={() => onDeleteClass(item.id)}
                disabled={deleting}
              >
                Supprimer la classe
              </button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

export default ClassList;