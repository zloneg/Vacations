import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response = await api.post("/auth/login", {
        email,
        password
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      window.location.href = "/vacations";
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#fff",
          border: "1px solid #d9d9d9",
          borderRadius: "20px",
          padding: "36px 32px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          textAlign: "center"
        }}
      >
        <h1
          style={{
            margin: "0 0 24px 0",
            fontSize: "52px",
            lineHeight: 1.1
          }}
        >
          Login
        </h1>

        <form
          onSubmit={handleSubmit}
          autoComplete="on"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px"
          }}
        >
          <input
            type="email"
            name="email"
            autoComplete="username"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: "12px",
              border: "1px solid #bfbfbf",
              fontSize: "16px",
              boxSizing: "border-box"
            }}
          />

          <input
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: "12px",
              border: "1px solid #bfbfbf",
              fontSize: "16px",
              boxSizing: "border-box"
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "6px",
              padding: "14px 16px",
              borderRadius: "12px",
              border: "1px solid #888",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: 600
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {error && (
          <p
            style={{
              color: "red",
              marginTop: "16px",
              marginBottom: "0"
            }}
          >
            {error}
          </p>
        )}

        <p
          style={{
            marginTop: "22px",
            marginBottom: 0,
            fontSize: "18px",
            color: "#666"
          }}
        >
          No account yet? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;