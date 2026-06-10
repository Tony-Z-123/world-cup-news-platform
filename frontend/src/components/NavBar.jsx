import { NavLink } from "react-router-dom";

export default function NavBar() {
  return (
    <nav style={{
      display: "flex",
      gap: "4px",
      justifyContent: "center",
      background: "#f3f4f6",
      borderRadius: "12px",
      padding: "6px",
      marginBottom: "28px",
    }}>
      {[
        { to: "/",          label: "🏠 Home",      end: true },
        { to: "/bracket",   label: "⚡ Bracket",   end: false },
        { to: "/standings", label: "🏆 Standings",  end: false },
      ].map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          style={({ isActive }) => ({
            padding: "8px 22px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 600,
            transition: "background 0.2s, color 0.2s",
            background: isActive ? "#1a6b3a" : "transparent",
            color: isActive ? "#fff" : "#444",
          })}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
