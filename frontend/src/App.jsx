import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import LoginPage from "./pages/admin/LoginPage.jsx";
import DashboardPage from "./pages/admin/DashboardPage.jsx";
import EventEditPage from "./pages/admin/EventEditPage.jsx";
import EventPage from "./pages/participant/EventPage.jsx";
import LyricsPage from "./pages/participant/LyricsPage.jsx";
import HomePage from "./pages/HomePage.jsx";

function RequireAuth({ children }) {
  const { admin, ready } = useAuth();
  if (!ready) return null;
  if (!admin) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      {/* Admin */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/events/new"
        element={
          <RequireAuth>
            <EventEditPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/events/:id"
        element={
          <RequireAuth>
            <EventEditPage />
          </RequireAuth>
        }
      />

      {/* Participant (public, reached via QR) */}
      <Route path="/event/:id" element={<EventPage />} />
      <Route path="/event/:id/song/:songId" element={<LyricsPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
