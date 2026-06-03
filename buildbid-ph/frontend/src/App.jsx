import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Bids from "./pages/Bids";
import Contracts from "./pages/Contracts";
import Payments from "./pages/Payments";
import Messages from "./pages/Messages";
import AdminPanel from "./pages/AdminPanel";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Analytics from "./pages/Analytics";
import Layout from "./components/Layout";

/*
function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.map((r) => r.toUpperCase()).includes(user?.role?.toUpperCase())) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
*/
function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (
    roles &&
    !roles
      .map((r) => r.toUpperCase())
      .includes(user?.role?.toUpperCase())
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="bids" element={<ProtectedRoute roles={["CLIENT", "CONTRACTOR"]}><Bids /></ProtectedRoute>} />
              <Route path="contracts" element={<Contracts />} />
              <Route path="payments" element={<Payments />} />
              <Route path="messages" element={<Messages />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="analytics" element={<ProtectedRoute roles={["ADMIN"]}><Analytics /></ProtectedRoute>} />
              <Route path="settings" element={<Settings />} />
              <Route path="admin" element={<ProtectedRoute roles={["ADMIN"]}><AdminPanel /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}
