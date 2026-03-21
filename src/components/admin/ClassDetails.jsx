import SessionControls from "./SessionControls";
import AdvancedActions from "./AdvancedActions";
import HistoryPanel from "./HistoryPanel";

function ClassDetails({
  selectedClass
}) {
  return (
    <section className="admin-class-details">
      <SessionControls selectedClass={selectedClass} />

      <div className="admin-details-row">
        <div className="admin-panel">
          <h2>Options</h2>

          {/* ✅ Bulle vide propre */}
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