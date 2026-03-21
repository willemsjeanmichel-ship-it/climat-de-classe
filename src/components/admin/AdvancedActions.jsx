function AdvancedActions({ selectedClass, className = "" }) {
  function openLink(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (!selectedClass) {
    return (
      <div className={`admin-panel ${className}`}>
        <h2>Outils</h2>
        <p>Sélectionne une classe pour accéder aux outils.</p>
      </div>
    );
  }

  const voteLink = `${window.location.origin}/vote/${selectedClass.slug}`;
  const dashboardLink = `${window.location.origin}/dashboard/${selectedClass.slug}`;
  const qrLink = `${window.location.origin}/qrcodes`;
  const statsLink = `${window.location.origin}/statistiques`;

  return (
    <div className={`admin-panel ${className}`}>
      <h2>Outils</h2>

      <div className="admin-tools-grid">
        <button
          type="button"
          className="admin-tool-card"
          onClick={() => openLink(qrLink)}
        >
          <span className="admin-tool-icon">📱</span>
          <strong>QR Codes</strong>
          <p>Afficher les QR codes</p>
        </button>

        <button
          type="button"
          className="admin-tool-card"
          onClick={() => openLink(statsLink)}
        >
          <span className="admin-tool-icon">📊</span>
          <strong>Statistiques</strong>
          <p>Voir les statistiques</p>
        </button>

        <button
          type="button"
          className="admin-tool-card"
          onClick={() => openLink(dashboardLink)}
        >
          <span className="admin-tool-icon">🖥️</span>
          <strong>Écran météo</strong>
          <p>Ouvrir la météo en direct</p>
        </button>

        <button
          type="button"
          className="admin-tool-card"
          onClick={() => openLink(voteLink)}
        >
          <span className="admin-tool-icon">🔗</span>
          <strong>Vote élèves</strong>
          <p>Ouvrir la page de vote</p>
        </button>
      </div>
    </div>
  );
}

export default AdvancedActions;