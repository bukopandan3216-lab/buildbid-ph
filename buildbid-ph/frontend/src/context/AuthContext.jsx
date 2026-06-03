import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // set axios base URL from Vite env if provided
    if (import.meta.env.VITE_API_URL) axios.defaults.baseURL = import.meta.env.VITE_API_URL;
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  async function fetchProfile() {
    try {
      const res = await axios.get("/api/auth/me");
      setUser(res.data.user);
    } catch {
      // if token expired or invalid, clear and redirect
      logout();
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const res = await axios.post("/api/auth/login", { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem("token", t);
    axios.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    return u;
  }

  async function register(data) {
    const res = await axios.post("/api/auth/register", data);
    if (res.data.pendingApproval) {
      return { pendingApproval: true, user: res.data.user };
    }

    const { token: t, user: u } = res.data;
    localStorage.setItem("token", t);
    axios.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    return u;
  }

  function logout() {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated: !!user, login, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

/*
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};
*/
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};