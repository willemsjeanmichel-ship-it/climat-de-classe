import { useState } from "react";
import { supabase } from "../../services/supabaseClient";

function ClassForm({ onClassCreated, onClose }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function generateSlug(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function generateCode(length = 6) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";

    for (let i = 0; i < length; i += 1) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  async function generateUniqueCode() {
    let code = "";
    let exists = true;

    while (exists) {
      code = generateCode();

      const { data, error: checkError } = await supabase
        .from("classes")
        .select("id")
        .eq("code", code)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      exists = !!data;
    }

    return code;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const cleanName = name.trim();
    const slug = generateSlug(cleanName);

    if (!cleanName) {
      setError("Le nom de la classe est obligatoire.");
      return;
    }

    if (!slug) {
      setError("Impossible de générer un slug valide.");
      return;
    }

    setLoading(true);

    try {
      const { data: existingSlug, error: slugError } = await supabase
        .from("classes")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (slugError) {
        throw slugError;
      }

      if (existingSlug) {
        setError("Une classe avec ce nom existe déjà.");
        setLoading(false);
        return;
      }

      const autoCode = await generateUniqueCode();

      const { error: insertError } = await supabase
        .from("classes")
        .insert({
          name: cleanName,
          code: autoCode,
          slug
        });

      if (insertError) {
        throw insertError;
      }

      setName("");

      if (onClassCreated) {
        onClassCreated();
      }

      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError("Impossible de créer la classe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-panel admin-class-form" onSubmit={handleSubmit}>
      <h2>Créer une classe</h2>

      <div className="admin-form-group">
        <label>Nom :</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Exemple : CAP D2"
        />
      </div>

      <div className="admin-buttons-row">
        <button
          type="submit"
          className="admin-primary-button"
          disabled={loading}
        >
          {loading ? "Création..." : "Créer la classe"}
        </button>

        <button
          type="button"
          className="admin-secondary-button"
          onClick={onClose}
          disabled={loading}
        >
          Annuler
        </button>
      </div>

      {error && <p className="admin-error-text">{error}</p>}
    </form>
  );
}

export default ClassForm;