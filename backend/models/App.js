import React, { useState, useEffect } from "react";
import History from "./History";
import Login from "./Login";

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("identify"); // "identify" | "history" | "login"

  // App load hone par saved login check karein
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Login successfully hone par call hoga
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setActiveTab("identify"); // Login ke baad direct main screen par jayein
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setActiveTab("login");
  };

  return (
    <div style={styles.appContainer}>
      {/* NAVBAR */}
      <header style={styles.navbar}>
        <h1 style={styles.logo}>📷 SnapID</h1>

        <nav style={styles.navLinks}>
          <button
            style={{
              ...styles.navBtn,
              fontWeight: activeTab === "identify" ? "bold" : "normal",
            }}
            onClick={() => setActiveTab("identify")}
          >
            🔍 Object Identify
          </button>

          <button
            style={{
              ...styles.navBtn,
              fontWeight: activeTab === "history" ? "bold" : "normal",
            }}
            onClick={() => setActiveTab("history")}
          >
            📜 History
          </button>

          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={styles.userBadge}>👤 {user.email}</span>
              <button onClick={handleLogout} style={styles.logoutBtn}>
                🚪 Logout
              </button>
            </div>
          ) : (
            <button
              style={{
                ...styles.loginNavBtn,
                fontWeight: activeTab === "login" ? "bold" : "normal",
              }}
              onClick={() => setActiveTab("login")}
            >
              🔐 Login / Signup
            </button>
          )}
        </nav>
      </header>

      {/* MAIN CONTENT AREA */}
      <main style={styles.mainContent}>
        {activeTab === "identify" && (
          <div style={styles.placeholderCard}>
            <h2>📷 Object Recognition Area</h2>
            <p>Yahan aapka main Camera ya Image Upload section rahega.</p>
          </div>
        )}

        {activeTab === "history" && <History />}

        {activeTab === "login" && !user && (
          <Login onLoginSuccess={handleLoginSuccess} />
        )}

        {activeTab === "login" && user && (
          <div style={styles.placeholderCard}>
            <h2>✅ Aap pehle se logged in hain!</h2>
            <p>Email: <strong>{user.email}</strong></p>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              Logout Karein
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// INLINE STYLES
const styles = {
  appContainer: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: "#f8fafc",
    minHeight: "100vh",
    color: "#1e293b",
  },
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 2rem",
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  logo: {
    margin: 0,
    fontSize: "1.5rem",
    color: "#2563eb",
  },
  navLinks: {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
  },
  navBtn: {
    background: "none",
    border: "none",
    fontSize: "1rem",
    cursor: "pointer",
    color: "#475569",
  },
  loginNavBtn: {
    padding: "0.4rem 0.8rem",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  userBadge: {
    fontSize: "0.9rem",
    color: "#475569",
    backgroundColor: "#e2e8f0",
    padding: "0.3rem 0.6rem",
    borderRadius: "12px",
  },
  logoutBtn: {
    padding: "0.4rem 0.8rem",
    backgroundColor: "#ef4444",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  mainContent: {
    maxWidth: "1000px",
    margin: "2rem auto",
    padding: "0 1rem",
  },
  placeholderCard: {
    backgroundColor: "#ffffff",
    padding: "2rem",
    borderRadius: "10px",
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
};