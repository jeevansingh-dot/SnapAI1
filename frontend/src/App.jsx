import { useEffect, useRef, useState } from "react";
import "./App.css";
import History from "./History";
import Login from "./Login";

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  // =========================
  // AUTH
  // =========================
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("snapidUser");

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Invalid saved user:", error);
        localStorage.removeItem("snapidUser");
      }
    }
  }, []);

  const handleLogin = (userData) => {
    localStorage.setItem("snapidUser", JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("snapidUser");
    setUser(null);
  };

  // =========================
  // IMAGE STATES
  // =========================
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState("");
  const [info, setInfo] = useState(null);

  const [loading, setLoading] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);
  const [message, setMessage] = useState("");

  // =========================
  // CAMERA
  // =========================
  const [cameraOpen, setCameraOpen] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // =========================
  // API URL CHECK
  // =========================
  useEffect(() => {
    console.log("SnapID API URL:", API_URL);

    if (!API_URL) {
      console.error("VITE_API_URL is not configured.");
      setMessage("Backend URL is not configured.");
    }
  }, []);

  // =========================
  // UPLOAD IMAGE
  // =========================
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));

    setResult("");
    setInfo(null);
    setMessage("");
  };

  // =========================
  // OPEN CAMERA
  // =========================
  const openCamera = async () => {
    try {
      setMessage("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage("Camera is not supported by this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
        },
        audio: false,
      });

      streamRef.current = stream;

      setCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error("Camera Error:", error);
      setMessage("Unable to access camera. Please allow camera permission.");
    }
  };

  // =========================
  // CAPTURE PHOTO
  // =========================
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setMessage("Unable to capture photo.");
          return;
        }

        const capturedFile = new File(
          [blob],
          "camera-photo.jpg",
          {
            type: "image/jpeg",
          }
        );

        setFile(capturedFile);
        setPreview(URL.createObjectURL(capturedFile));

        setResult("");
        setInfo(null);
        setMessage("");

        closeCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  // =========================
  // CLOSE CAMERA
  // =========================
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    setCameraOpen(false);
  };

  // =========================
  // CAMERA CLEANUP
  // =========================
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  // =========================
  // REMOVE IMAGE
  // =========================
  const removeImage = () => {
    setFile(null);
    setPreview("");
    setResult("");
    setInfo(null);
    setMessage("");
  };

  // =========================
  // SAVE HISTORY
  // =========================
  const saveHistory = async ({
    objectName,
    category,
    description,
    confidence,
    image,
    wikipediaUrl,
  }) => {
    try {
      const response = await fetch(
        `${API_URL}/api/history`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            objectName,
            category,
            description,
            confidence,
            image,
            wikipediaUrl,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("History Save Failed:", data);

        throw new Error(
          data.error ||
            data.message ||
            "Failed to save history"
        );
      }

      console.log("History Saved:", data);

      window.dispatchEvent(
        new Event("historyUpdated")
      );
    } catch (error) {
      console.error("History Error:", error);
    }
  };

  // =========================
  // IDENTIFY OBJECT
  // =========================
  const handleIdentify = async () => {
    if (!file) {
      setMessage("Please upload or capture an image first.");
      return;
    }

    if (!API_URL) {
      setMessage("Backend URL is missing.");
      return;
    }

    try {
      setLoading(true);
      setInfoLoading(false);

      setMessage("");
      setResult("");
      setInfo(null);

      // -------------------------
      // CREATE FORM DATA
      // -------------------------
      const formData = new FormData();

      formData.append("image", file);

      console.log("Sending image to:", `${API_URL}/api/identify`);

      // -------------------------
      // CALL AI API
      // -------------------------
      const response = await fetch(
        `${API_URL}/api/identify`,
        {
          method: "POST",
          body: formData,
        }
      );

      // IMPORTANT:
      // response.json() ONLY ONCE
      const data = await response.json();

      console.log("Identify API Response:", data);

      // -------------------------
      // HANDLE BACKEND ERROR
      // -------------------------
      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            `AI identification failed (${response.status})`
        );
      }

      if (!data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "AI identification failed"
        );
      }

      // -------------------------
      // AI RESULT
      // -------------------------
      const aiResult = data.result || "";

      setResult(aiResult);

      // -------------------------
      // PARSE AI RESULT
      // -------------------------
      let category = "Unknown";
      let objectName = "Unknown";
      let description = "";
      let confidence = 0;

      const categoryMatch = aiResult.match(
        /Category:\s*(.+)/i
      );

      const nameMatch = aiResult.match(
        /Name:\s*(.+)/i
      );

      const descriptionMatch = aiResult.match(
        /Description:\s*(.+)/i
      );

      const confidenceMatch = aiResult.match(
        /Confidence:\s*(0?\.\d+|1(?:\.0)?|\d+(?:\.\d+)?)/i
      );

      if (categoryMatch) {
        category = categoryMatch[1].trim();
      }

      if (nameMatch) {
        objectName = nameMatch[1].trim();
      }

      if (descriptionMatch) {
        description = descriptionMatch[1].trim();
      }

      if (confidenceMatch) {
        let confidenceValue = parseFloat(
          confidenceMatch[1]
        );

        // If AI returns 98 instead of 0.98
        if (confidenceValue > 1) {
          confidenceValue =
            confidenceValue / 100;
        }

        confidence = confidenceValue;
      }

      console.log("Parsed AI Result:", {
        category,
        objectName,
        description,
        confidence,
      });

      // =========================
      // WIKIPEDIA INFO
      // =========================
      setInfoLoading(true);

      let wikipediaImage = "";
      let wikipediaUrl = "";

      try {
        const infoResponse = await fetch(
          `${API_URL}/api/info?name=${encodeURIComponent(
            objectName
          )}`
        );

        const infoData = await infoResponse.json();

        console.log("Wikipedia API Response:", infoData);

        if (infoResponse.ok && infoData.success) {
          setInfo(infoData);

          wikipediaImage =
            infoData.image || "";

          wikipediaUrl =
            infoData.wikipediaUrl || "";
        }
      } catch (infoError) {
        console.error(
          "Wikipedia Info Error:",
          infoError
        );
      } finally {
        setInfoLoading(false);
      }

      // =========================
      // SAVE HISTORY
      // =========================
      await saveHistory({
        objectName,
        category,
        description,
        confidence,
        image:
          wikipediaImage ||
          data.image ||
          preview ||
          "",
        wikipediaUrl,
      });

      setMessage(
        "Object identified successfully!"
      );
    } catch (error) {
      console.error(
        "Identification Error:",
        error
      );

      // IMPORTANT:
      // Actual backend error show karega
      setMessage(
        error.message ||
          "AI identification failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // LOGIN SCREEN
  // =========================
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // =========================
  // MAIN APP
  // =========================
  return (
    <div className="app">

      {/* =========================
          HEADER
      ========================= */}
      <header className="header">

        <div className="brand">

          <div className="brand-icon">
            🔍
          </div>

          <div>
            <h1>SnapID</h1>

            <p>
              Ek Photo, Poori Pehchaan
            </p>
          </div>

        </div>

        <div className="header-user">

          <span>
            Hi, {user?.name || "User"}
          </span>

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </header>

      {/* =========================
          HERO
      ========================= */}
      <section className="hero">

        <div className="hero-content">

          <span className="hero-badge">
            ✨ AI Powered Recognition
          </span>

          <h2>
            Identify Anything
            <br />
            From One Photo
          </h2>

          <p>
            Upload or capture a photo and
            let SnapID identify forts,
            plants, vehicles and more.
          </p>

        </div>

      </section>

      {/* =========================
          UPLOAD SECTION
      ========================= */}
      <main className="main-container">

        <section className="upload-card">

          <div className="section-heading">

            <h2>
              📸 Identify an Object
            </h2>

            <p>
              Upload an image or use your camera
            </p>

          </div>

          {!preview && (
            <div className="upload-actions">

              <label className="upload-btn">

                📁 Upload Photo

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  hidden
                />

              </label>

              <button
                className="camera-btn"
                onClick={openCamera}
              >
                📷 Open Camera
              </button>

            </div>
          )}

          {/* =========================
              CAMERA MODAL
          ========================= */}
          {cameraOpen && (
            <div className="camera-overlay">

              <div className="camera-modal">

                <div className="camera-header">

                  <h3>
                    Take a Photo
                  </h3>

                  <button
                    onClick={closeCamera}
                    className="camera-close"
                  >
                    ✕
                  </button>

                </div>

                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="camera-video"
                />

                <div className="camera-controls">

                  <button
                    className="capture-btn"
                    onClick={capturePhoto}
                  >
                    📸 Capture
                  </button>

                  <button
                    className="cancel-camera-btn"
                    onClick={closeCamera}
                  >
                    Cancel
                  </button>

                </div>

              </div>

            </div>
          )}

          {/* =========================
              IMAGE PREVIEW
          ========================= */}
          {preview && (
            <div className="preview-section">

              <div className="preview-header">

                <h3>
                  Selected Image
                </h3>

                <button
                  className="remove-btn"
                  onClick={removeImage}
                >
                  ✕ Remove
                </button>

              </div>

              <div className="preview-wrapper">

                <img
                  src={preview}
                  alt="Selected"
                  className="preview-image"
                />

              </div>

              <button
                className="identify-btn"
                onClick={handleIdentify}
                disabled={loading}
              >
                {loading
                  ? "🔄 Identifying..."
                  : "✨ Identify Object"}
              </button>

            </div>
          )}

          {/* =========================
              MESSAGE
          ========================= */}
          {message && (
            <div className="message-box">
              {message}
            </div>
          )}

        </section>

        {/* =========================
            AI RESULT
        ========================= */}
        {result && (
          <section className="result-card">

            <div className="section-heading">

              <span className="result-label">
                AI RESULT
              </span>

              <h2>
                🔎 Recognition Result
              </h2>

            </div>

            <div className="result-content">

              <pre className="result-text">
                {result}
              </pre>

            </div>

          </section>
        )}

        {/* =========================
            WIKIPEDIA INFO
        ========================= */}
        {infoLoading && (
          <section className="info-card">

            <div className="loading-info">
              🔄 Fetching detailed information...
            </div>

          </section>
        )}

        {info && (
          <section className="info-card">

            <div className="section-heading">

              <span className="result-label">
                DETAILED INFORMATION
              </span>

              <h2>
                📚 About {info.name}
              </h2>

            </div>

            <div className="info-content">

              {info.image && (
                <div className="info-image-container">

                  <img
                    src={info.image}
                    alt={info.name}
                    className="info-image"
                  />

                </div>
              )}

              <div className="info-details">

                <h3>
                  {info.name}
                </h3>

                <p>
                  {info.description ||
                    info.extract ||
                    "No detailed information available."}
                </p>

                {info.wikipediaUrl && (
                  <a
                    href={info.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wiki-btn"
                  >
                    📖 Read on Wikipedia
                  </a>
                )}

              </div>

            </div>

          </section>
        )}

        {/* =========================
            HISTORY
        ========================= */}
        <section className="history-section">

          <History />

        </section>

      </main>

      {/* =========================
          FOOTER
      ========================= */}
      <footer className="footer">

        <div>
          <strong>SnapID</strong>
          <span>
            {" "}— Ek Photo, Poori Pehchaan
          </span>
        </div>

        <p>
          AI-powered object recognition
        </p>

      </footer>

    </div>
  );
}

export default App;
