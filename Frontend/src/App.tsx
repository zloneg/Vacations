import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VacationsPage from "./pages/VacationsPage";
import ReportsPage from "./pages/ReportsPage";
import AiRecommendationPage from "./pages/AiRecommendationPage";
import McpPage from "./pages/McpPage";

function App() {
  const token = localStorage.getItem("token");
  const userText = localStorage.getItem("user");

  let user: any = null;

  try {
    user = userText ? JSON.parse(userText) : null;
  } catch {
    user = null;
  }

  const isAdmin = user?.role === "admin";

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={token ? "/vacations" : "/login"} />}
      />

      <Route
        path="/login"
        element={token ? <Navigate to="/vacations" /> : <LoginPage />}
      />

      <Route
        path="/register"
        element={token ? <Navigate to="/vacations" /> : <RegisterPage />}
      />

      <Route
        path="/vacations"
        element={token ? <VacationsPage /> : <Navigate to="/login" />}
      />

      <Route
        path="/ai-recommendation"
        element={token ? <AiRecommendationPage /> : <Navigate to="/login" />}
      />

      <Route
        path="/mcp"
        element={token ? <McpPage /> : <Navigate to="/login" />}
      />

      <Route
        path="/reports"
        element={
          token ? (
            isAdmin ? <ReportsPage /> : <Navigate to="/vacations" />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="*"
        element={<Navigate to={token ? "/vacations" : "/login"} />}
      />
    </Routes>
  );
}

export default App;