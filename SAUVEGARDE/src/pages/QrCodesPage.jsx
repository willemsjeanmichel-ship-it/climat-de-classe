import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { supabase } from "../services/supabaseClient";
import "../styles/qrcodes.css";

function QrCodesPage() {
  const [classes, setClasses] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const baseUrl = window.location.origin;

  useEffect(() => {
    loadClasses();

    const classesChannel = supabase
      .channel("qrcodes-classes-live")
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

  async function loadClasses() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("classes")
      .select("id, name, code, slug")
      .order("name");

    if (error) {
      console.error("Erreur chargement classes :", error);
      setError("Impossible de charger les classes.");
      setLoading(false);
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

    setLoading(false);
  }

  const selectedClass = useMemo(() => {
    return classes.find((item) => item.slug === selectedSlug) || null;
  }, [classes, selectedSlug]);

  const voteUrl = selectedClass ? `${baseUrl}/vote/${selectedClass.slug}` : "";

  function handlePrint() {
    window.print();
  }

  return (
    <div className="qr-page">
      <header className="qr-hero">
        <div className="qr-hero-bubble">
          <h1>QR Code élève</h1>
          <p>Choisis une classe puis imprime le QR code de vote</p>
        </div>
      </header>

      <section className="qr-panel">
        <div className="qr-toolbar">
          <div className="qr-field">
            <label htmlFor="qr-class-select" className="qr-label">
              Classe
            </label>

            <select
              id="qr-class-select"
              className="qr-select"
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              disabled={loading || classes.length === 0}
            >
              {classes.length === 0 && (
                <option value="">
                  Aucune classe disponible
                </option>
              )}

              {classes.map((classe) => (
                <option key={classe.id} value={classe.slug}>
                  {classe.name} — {classe.code}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="qr-print-button"
            onClick={handlePrint}
            disabled={!selectedClass}
          >
            Imprimer
          </button>
        </div>

        {loading && (
          <p className="qr-state">Chargement des classes...</p>
        )}

        {error && (
          <p className="qr-state qr-state-error">{error}</p>
        )}

        {!loading && !error && selectedClass && (
          <div className="qr-card">
            <div className="qr-card-header">
              <h2>{selectedClass.name}</h2>
              <p>Code classe : {selectedClass.code}</p>
            </div>

            <div className="qr-code-wrap">
              <div className="qr-code-box">
                <QRCode value={voteUrl} size={220} />
              </div>
            </div>

            <div className="qr-card-footer">
              <p className="qr-card-label">Lien élève</p>
              <p className="qr-card-url">{voteUrl}</p>
            </div>
          </div>
        )}

        {!loading && !error && !selectedClass && classes.length === 0 && (
          <p className="qr-state">
            Crée d’abord une classe pour générer un QR code.
          </p>
        )}
      </section>
    </div>
  );
}

export default QrCodesPage;