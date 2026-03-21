import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AdminPage from "./pages/AdminPage";
import DashboardPage from "./pages/DashboardPage";
import StudentVotePage from "./pages/StudentVotePage";
import AlreadyVotedPage from "./pages/AlreadyVotedPage";
import ThankYouPage from "./pages/ThankYouPage";
import QrCodesPage from "./pages/QrCodesPage";
import StatisticsPage from "./pages/StatisticsPage";
import ProblemReportPage from "./pages/ProblemReportPage";

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/admin" replace />}
        />

        <Route
          path="/admin"
          element={<AdminPage />}
        />

        <Route
          path="/dashboard/:slug"
          element={<DashboardPage />}
        />

        <Route
          path="/vote/:slug"
          element={<StudentVotePage />}
        />

        <Route
          path="/deja-vote"
          element={<AlreadyVotedPage />}
        />

        <Route
          path="/merci"
          element={<ThankYouPage />}
        />

        <Route
          path="/qrcodes"
          element={<QrCodesPage />}
        />

        <Route
          path="/statistiques"
          element={<StatisticsPage />}
        />

        <Route
          path="/probleme"
          element={<ProblemReportPage />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;