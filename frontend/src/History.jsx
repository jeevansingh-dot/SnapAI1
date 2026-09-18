import React, { useEffect, useState } from "react";

function History() {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api/history`;
  // ==========================================
  // FETCH HISTORY
  // ==========================================
  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(API_BASE_URL);
      const data = await res.json();

      if (res.ok && data.success) {
        setHistoryItems(data.history || []);
      } else {
        setError(data.message || "Failed to load history.");
      }
    } catch (err) {
      console.error("Fetch History Error:", err);
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // ==========================================
  // DELETE HISTORY ITEM
  // ==========================================
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this history item?")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Remove item from state locally
        setHistoryItems((prev) => prev.filter((item) => item._id !== id));
      } else {
        alert(data.message || "Failed to delete history record.");
      }
    } catch (err) {
      console.error("Delete History Error:", err);
      alert("Error deleting record from server.");
    }
  };

  return (
    <div className="history-container" style={{ marginTop: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>📜 Recognition History</h2>
        <button
          onClick={fetchHistory}
          style={{
            padding: "0.4rem 0.8rem",
            cursor: "pointer",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#007bff",
            color: "#fff",
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {loading && <p style={{ marginTop: "1rem" }}>Loading history...</p>}

      {error && (
        <p className="message" style={{ color: "red", marginTop: "1rem" }}>
          ⚠️ {error}
        </p>
      )}

      {!loading && !error && historyItems.length === 0 && (
        <p style={{ marginTop: "1rem", opacity: 0.8 }}>No history records found yet.</p>
      )}

      <div
        className="history-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "1rem",
          marginTop: "1.5rem",
        }}
      >
        {historyItems.map((item) => (
          <div
            key={item._id}
            className="history-card"
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "1rem",
              position: "relative",
              backgroundColor: "#fff",
            }}
          >
            <button
              onClick={() => handleDelete(item._id)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "1.1rem",
              }}
              title="Delete"
            >
              🗑️
            </button>

            {item.image && (
              <img
                src={item.image}
                alt={item.objectName}
                style={{
                  width: "100%",
                  height: "150px",
                  objectFit: "cover",
                  borderRadius: "6px",
                  marginBottom: "0.5rem",
                }}
              />
            )}

            <h3>{item.objectName}</h3>

            <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.5rem" }}>
              Category: <strong>{item.category}</strong>
            </p>

            {item.description && (
              <p style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                {item.description}
              </p>
            )}

            {item.wikipediaUrl && (
              <a
                href={item.wikipediaUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: "0.85rem", color: "#007bff" }}
              >
                Read More →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default History;
