import { Link } from "react-router-dom";
import { BrandMark } from "./Navbar";

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <aside className="auth-aside">
        <Link to="/login" className="brand">
          <BrandMark />
          <span className="brand-name">CareerTrack</span>
        </Link>

        <div>
          <p className="auth-quote">A calmer way to run your job search.</p>
          <ul className="auth-points">
            <li>Every application and deadline in one place</li>
            <li>Interview prep tied to each company</li>
            <li>Weekly goals and a clear view of your pipeline</li>
          </ul>
        </div>

        <span />
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="auth-sub">{subtitle}</p>
          {children}
          <p className="auth-alt">{footer}</p>
        </div>
      </main>
    </div>
  );
}

export default AuthShell;
