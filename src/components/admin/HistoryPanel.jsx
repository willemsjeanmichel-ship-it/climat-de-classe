import { useEffect, useState } from "react";

const ACTIVITY_STORAGE_KEY = "climat-classe-admin-activity";
const ACTIVITY_EVENT = "climat-classe-history-updated";

function HistoryPanel({ selectedClass }) {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    loadActivities();

    function refresh() {
      loadActivities();
    }

    function handleStorage(event) {
      if (event.key === ACTIVITY_STORAGE_KEY) {
        loadActivities();
      }
    }

    window.addEventListener(ACTIVITY_EVENT, refresh);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(ACTIVITY_EVENT, refresh);
      window.removeEventListener("storage", handleStorage);
    };
  }, [selectedClass]);

  function loadActivities() {
    const saved = JSON.parse(localStorage.getItem(ACTIVITY_STORAGE_KEY) || "[]");

    const filtered = selectedClass
      ? saved.filter((item) => item.classId === selectedClass.id)
      : saved;

    setActivities(filtered.slice(0, 5));
  }

  function handleClearHistory() {
    const saved = JSON.parse(localStorage.getItem(ACTIVITY_STORAGE_KEY) || "[]");

    if (selectedClass) {
      const filtered = saved.filter((item) => item.classId !== selectedClass.id);
      localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(filtered));
    } else {
      localStorage.removeItem(ACTIVITY_STORAGE_KEY);
    }

    window.dispatchEvent(new CustomEvent(ACTIVITY_EVENT));
    setActivities([]);
  }

  function getActionLabel(type) {
    if (type === "open") return "Séance ouverte";
    if (type === "close") return "Séance fermée";
    if (type === "reset") return "Votes réinitialisés";
    return "Action";
  }

  function getActionIcon(type) {
    if (type === "open") return "🟢";
    if (type === "close") return "🔴";
    if (type === "reset") return "🔵";
    return "📘";
  }

  function formatDate(dateValue) {
    if (!dateValue) return "Date inconnue";

    const date = new Date(dateValue);

    return date.toLocaleString("fr-BE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2>Historique des séances</h2>

        <button
          type="button"
          className="admin-secondary-button"
          onClick={handleClearHistory}
        >
          Supprimer l’historique
        </button>
      </div>

      {activities.length === 0 && (
        <p>Aucune activité récente pour cette classe.</p>
      )}

      {activities.length > 0 && (
        <div className="admin-history-list">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="admin-history-item admin-history-book-item"
            >
              <div className="admin-history-book-icon">
                {getActionIcon(activity.type)}
              </div>

              <div className="admin-history-book-content">
                <strong>{getActionLabel(activity.type)}</strong>

                <p>
                  <strong>Classe :</strong> {activity.className} ({activity.classCode})
                </p>

                <span className="admin-history-date">
                  {formatDate(activity.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HistoryPanel;