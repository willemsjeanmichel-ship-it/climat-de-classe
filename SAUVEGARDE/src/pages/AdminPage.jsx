import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

import AdminHeader from "../components/admin/AdminHeader";
import AdminStats from "../components/admin/AdminStats";
import ClassList from "../components/admin/ClassList";
import ClassDetails from "../components/admin/ClassDetails";

import "../styles/admin.css";

const ADMIN_THEME_STORAGE_KEY = "climat-classe-admin-theme";
const ADMIN_SCALE_STORAGE_KEY = "climat-classe-admin-scale";

function AdminPage() {
  const [selectedClass, setSelectedClass] = useState(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [adminTheme, setAdminTheme] = useState(() => {
    const savedTheme = localStorage.getItem(ADMIN_THEME_STORAGE_KEY);

    if (["blue", "green", "beige", "gray"].includes(savedTheme)) {
      return savedTheme;
    }

    return "blue";
  });

  const [adminScale, setAdminScale] = useState(() => {
    const savedScale = localStorage.getItem(ADMIN_SCALE_STORAGE_KEY);

    if (["small", "normal", "large"].includes(savedScale)) {
      return savedScale;
    }

    return "large";
  });

  useEffect(() => {
    localStorage.setItem(ADMIN_THEME_STORAGE_KEY, adminTheme);
  }, [adminTheme]);

  useEffect(() => {
    localStorage.setItem(ADMIN_SCALE_STORAGE_KEY, adminScale);
  }, [adminScale]);

  async function handleDeleteClass(classId) {
    if (!classId) return;

    const confirmDelete = window.confirm("Supprimer cette classe ?");
    if (!confirmDelete) return;

    setLoadingDelete(true);

    const { error } = await supabase
      .from("classes")
      .delete()
      .eq("id", classId);

    if (error) {
      console.error("Erreur suppression classe :", error);
      alert("Impossible de supprimer la classe.");
      setLoadingDelete(false);
      return;
    }

    setSelectedClass((prev) => (prev?.id === classId ? null : prev));
    setLoadingDelete(false);
  }

  return (
    <div className={`admin-page admin-theme-${adminTheme} admin-scale-${adminScale}`}>
      <AdminHeader />

      <div className="admin-stats-row">
        <AdminStats />
      </div>

      <div className="admin-main-layout">
        <ClassList
          onSelectClass={setSelectedClass}
          selectedClass={selectedClass}
          onDeleteClass={handleDeleteClass}
          deleting={loadingDelete}
        />

        <ClassDetails
          selectedClass={selectedClass}
          adminTheme={adminTheme}
          adminScale={adminScale}
          onThemeChange={setAdminTheme}
          onScaleChange={setAdminScale}
        />
      </div>
    </div>
  );
}

export default AdminPage;