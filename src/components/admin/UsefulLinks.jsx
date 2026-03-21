function UsefulLinks({ selectedClass }) {
  if (!selectedClass) {
    return (
      <div className="admin-panel">
        <h2>Accès rapides</h2>
        <p>Sélectionne une classe pour afficher les liens.</p>
      </div>
    );
  }

  const voteLink = `${window.location.origin}/vote/${selectedClass.slug}`;
  const dashboardLink = `${window.location.origin}/dashboard/${selectedClass.slug}`;

  function copyLink(text) {
    navigator.clipboard.writeText(text);
  }

  function openLink(url) {
    window.open(url, "_blank");
  }

  return (
    <div className="admin-panel">
      <h2>Accès rapides</h2>

      <div className="admin-links-grid">
        <div className="admin-link-card">
          <strong>Lien élèves</strong>

          <input type="text" value={voteLink} readOnly />

          <div className="admin-buttons-row">
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => copyLink(voteLink)}
            >
              Copier
            </button>

            <button
              type="button"
              className="admin-primary-button"
              onClick={() => openLink(voteLink)}
            >
              Ouvrir
            </button>
          </div>
        </div>

        <div className="admin-link-card">
          <strong>Dashboard enseignant</strong>

          <input type="text" value={dashboardLink} readOnly />

          <div className="admin-buttons-row">
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => copyLink(dashboardLink)}
            >
              Copier
            </button>

            <button
              type="button"
              className="admin-primary-button"
              onClick={() => openLink(dashboardLink)}
            >
              Ouvrir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UsefulLinks;