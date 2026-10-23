
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { loginUser } from "../services/authService";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("Logging in...");
    setLoading(true);

    try {
      const data = await loginUser({ email, password });

      if (!data.token) {
        throw new Error("No token received from the server.");
      }

      localStorage.setItem("token", data.token);
      setMessage("Login successful!");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setMessage(error.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const isError = message && !loading && message !== "Login successful!";

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to pick up where you left off."
      footer={
        <>
          New here? <Link to="/register">Create an account</Link>
        </>
      }
    >
      <form onSubmit={handleLogin}>
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit" className="btn btn-block" disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>

      {message && (
        <p role="status" className={`notice${isError ? " error" : ""}`}>
          {message}
        </p>
      )}
    </AuthShell>
  );
}

export default Login;