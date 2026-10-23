import { useNavigate, useLocation, Link } from "react-router-dom";

const links = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Applications", path: "/applications" },
  { label: "Analytics", path: "/analytics" },
  { label: "Notes", path: "/notes" },
];

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M2 11.5 6 7.5l2.5 2.5L14 4.5M10 4.5h4v4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const isActive = (path) =>
    location.pathname === path ||
    (path === "/applications" && location.pathname.startsWith("/applications/"));

  return (
    <header className="nav">
      <nav className="nav-inner" aria-label="Main">
        <Link to="/dashboard" className="brand">
          <BrandMark />
          <span className="brand-name">CareerTrack</span>
        </Link>

        <div className="nav-links">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link${isActive(link.path) ? " active" : ""}`}
              aria-current={isActive(link.path) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}

          <button type="button" onClick={handleLogout} className="nav-logout">
            Log out
          </button>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
