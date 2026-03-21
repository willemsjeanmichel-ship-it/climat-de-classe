import { useEffect } from "react";
import SessionControls from "./SessionControls";
import AdvancedActions from "./AdvancedActions";
import HistoryPanel from "./HistoryPanel";

function ClassDetails({
  selectedClass,
  adminScale
}) {

  // ✅ Gestion directe du scale (sans parent)
  useEffect(() => {
    let value = 1;

    if (adminScale === "small") value = 0.9;
    if (adminScale === "normal") value = 1;
    if (adminScale === "large") value = 1.15;

    document.documentElement.style.setProperty("--ui-scale", value);
  }, [adminScale]);

  return (
    <section className="admin-class-details">
      <SessionControls selectedClass={selectedClass} />

      <div className="admin-details-row">
        <div className="admin-panel">
          <h2>Options</h2>

          <div className="admin-options-grid">
            <div className="admin-option-card">
              <label className="admin-option-label" htmlFor="admin-scale-select">
                Taille de l’interface
              </label>

              <select
                id="admin-scale-select"
                className="admin-option-select"
                value={adminScale}
                onChange={(e) => {
                  const scale = e.target.value;

                  // applique directement
                  let value = 1;
                  if (scale === "small") value = 0.9;
                  if (scale === "normal") value = 1;
                  if (scale === "large") value = 1.15;

                  document.documentElement.style.setProperty("--ui-scale", value);
                }}
              >
                <option value="small">Petite</option>
                <option value="normal">Normale</option>
                <option value="large">Grande</option>
              </select>
            </div>
          </div>
        </div>

        <AdvancedActions selectedClass={selectedClass} />
      </div>

      <HistoryPanel selectedClass={selectedClass} />
    </section>
  );
}

export default ClassDetails;