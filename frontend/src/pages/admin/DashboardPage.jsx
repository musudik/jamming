import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api.js";
import { useAuth } from "../../auth.jsx";
import { Button, Spinner, ErrorBox } from "../../components/ui.jsx";

export default function DashboardPage() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await api.listEvents();
      setEvents(Array.isArray(data) ? data : []); // guard against unexpected non-array
    } catch (err) {
      setEvents([]); // stop the spinner; the error box explains what happened
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(id) {
    if (!confirm("Delete this event and all its songs?")) return;
    try {
      await api.deleteEvent(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My events</h1>
          <p className="text-sm text-muted">{admin?.email}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/events/new">
            <Button>+ New event</Button>
          </Link>
          <Button
            variant="ghost"
            onClick={() => {
              logout();
              navigate("/admin/login");
            }}
          >
            Logout
          </Button>
        </div>
      </header>

      <ErrorBox message={error} />

      {events === null ? (
        <Spinner />
      ) : events.length === 0 ? (
        <p className="text-muted">No events yet. Create your first one.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="flex items-center justify-between rounded-xl border border-line bg-surface p-4"
            >
              <Link to={`/admin/events/${ev.id}`} className="min-w-0">
                <div className="truncate font-semibold">{ev.name}</div>
                <div className="text-sm text-muted">
                  {ev.venue || "No venue"} · {ev._count?.songs ?? 0} songs · {ev.status}
                </div>
              </Link>
              <div className="flex shrink-0 gap-2">
                <Link to={`/admin/events/${ev.id}`}>
                  <Button variant="secondary">Manage</Button>
                </Link>
                <Button variant="danger" onClick={() => onDelete(ev.id)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
