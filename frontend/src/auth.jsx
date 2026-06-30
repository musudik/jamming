import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Trust an existing token; a real app would verify it against the server.
    const token = getToken();
    if (token) {
      const stored = localStorage.getItem("jamlyrics_admin");
      if (stored) setAdmin(JSON.parse(stored));
    }
    setReady(true);
  }, []);

  async function login(email, password) {
    const { token, admin } = await api.login(email, password);
    setToken(token);
    localStorage.setItem("jamlyrics_admin", JSON.stringify(admin));
    setAdmin(admin);
  }

  function logout() {
    setToken(null);
    localStorage.removeItem("jamlyrics_admin");
    setAdmin(null);
  }

  return (
    <AuthContext.Provider value={{ admin, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
