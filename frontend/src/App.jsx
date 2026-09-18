import { useEffect, useRef, useState } from "react";
import "./App.css";
import History from "./History";
import Login from "./Login";
const API_URL = import.meta.env.VITE_API_URL;

function App() {
  // ==============================
  // USER AUTHENTICATION
  // ==============================

  const [user, setUser] = useState(null);

  // ==============================
  // IMAGE STATES
  // ==============================

  const [image, setImage] = useState(null);
  const [file, setFile] = useState(null);

  // ==============================
  // RESULT STATES
  // ==============================

  const [result, setResult] = useState("");
  const [info, setInfo] = useState(null);

  // ==============================
  // LOADING STATES
  // ==============================

  const [loading, setLoading] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);

  // ==============================
  // MESSAGE
  // ==============================

  const [message, setMessage] = useState("");

  // ==============================
  // CAMERA
  // ==============================

  const [cameraOpen, setCameraOpen] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // ==============================
  // CHECK LOGIN
  // ==============================

  useEffect(() => {
    const savedUser = localStorage.getItem("snapidUser");

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error("Saved user error:", error);
        localStorage.removeItem("snapidUser");
      }
    }
  }, []);

  // ==============================
  // LOGIN SUCCESS
  // ==============================

  const handleLogin = (loggedInUser) => {
    localStorage.setItem(
      "snapidUser",
      JSON.stringify(loggedInUser)
    );

    setUser(loggedInUser);
  };

  // ==============================
  // LOGOUT
  // ==============================

  const handleLogout = () => {
    localStorage.removeItem("snapidUser");

    setUser(null);

    setImage(null);
    setFile(null);
    setResult("");
    setInfo(null);
    setMessage("");

    closeCamera();
  };

  // ==============================
  // IMAGE UPLOAD
  // ==============================

  const handleImageChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setImage(URL.createObjectURL(selectedFile));

    setResult("");
    setInfo(null);
    setMessage("");
  };

  // ==============================
  // OPEN CAMERA
  // ==============================

  const openCamera = async () => {
    try {
      setMessage("");

      const stream =
        await navigator.mediaDevices.getUserMedia({
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

      setMessage(
        "Camera access denied or camera is not available."
      );
    }
  };

  // ==============================
  // CLOSE CAMERA
  // ==============================

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
  };

  // ==============================
  // CAPTURE PHOTO
  // ==============================

  const capturePhoto = () => {
    const video = videoRef.current;

    if (!video) return;

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) return;

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const capturedFile = new File(
          [blob],
          "snapid-photo.jpg",
          {
            type: "image/jpeg",
          }
        );

        setFile(capturedFile);
        setImage(URL.createObjectURL(blob));

        setResult("");
        setInfo(null);
        setMessage("");

        closeCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  // ==============================
  // STOP CAMERA ON UNMOUNT
  // ==============================

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  // ==============================
  // SAVE HISTORY
  // ==============================

  const saveHistory = async (
    objectName,
    category,
    description,
    confidence,
    image,
    wikipediaUrl
  ) => {
    try {
     const response = await fetch(
  `${API_URL}/api/history`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // tumhara existing data
    }),
  }
);

      const data = await response.json();

      if (!response.ok) {
        console.error(
          "History Save Failed:",
          data.message
        );
        return;
      }

      console.log(
        "History saved successfully:",
        data.history
      );
    } catch (error) {
      console.error("History Error:", error);
    }
  };

  // ==============================
  // IDENTIFY OBJECT
  // ==============================

  const handleIdentify = async () => {
    if (!file) {
      setMessage(
        "Please select or capture an image first."
      );
      return;
    }

    const formData = new FormData();

    formData.append("image", file);

    try {
      setLoading(true);
      setMessage("");
      setResult("");
      setInfo(null);

      // ==========================
      // GEMINI AI
      // ==========================

     const response = await fetch(
  `${API_URL}/api/identify`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Identification failed."
        );
        return;
      }

      setResult(data.result);

      // ==========================
      // PARSE AI RESULT
      // ==========================

      const lines = data.result.split("\n");

      let objectName = "";
      let category = "";
      let description = "";
      let confidence = 0;

      lines.forEach((line) => {
        const lowerLine = line
          .toLowerCase()
          .trim();

        if (lowerLine.startsWith("name:")) {
          objectName = line
            .substring(line.indexOf(":") + 1)
            .trim();
        }

        if (lowerLine.startsWith("category:")) {
          category = line
            .substring(line.indexOf(":") + 1)
            .trim();
        }

        if (lowerLine.startsWith("description:")) {
          description = line
            .substring(line.indexOf(":") + 1)
            .trim();
        }

        if (lowerLine.startsWith("confidence:")) {
          confidence = parseFloat(
            line
              .substring(line.indexOf(":") + 1)
              .trim()
          );
        }
      });

      console.log("Parsed AI Data:", {
        objectName,
        category,
        description,
        confidence,
      });

      // ==========================
      // WIKIPEDIA
      // ==========================

      let wikipediaData = null;

      if (
        objectName &&
        objectName.toLowerCase() !== "unknown"
      ) {
        try {
          setInfoLoading(true);

          const infoResponse = await fetch(
  `${API_URL}/api/info?name=${encodeURIComponent(
    objectName
  )}`
);

          const infoData = await infoResponse.json();

          if (infoResponse.ok) {
            setInfo(infoData);
            wikipediaData = infoData;
          } else {
            console.log(
              "Wikipedia information not found."
            );
          }
        } catch (error) {
          console.error("Wikipedia Error:", error);
        } finally {
          setInfoLoading(false);
        }
      }

      // ==========================
      // SAVE HISTORY
      // ==========================

      if (
        objectName &&
        objectName.toLowerCase() !== "unknown"
      ) {
        await saveHistory(
          objectName,
          category,
          description,
          confidence,
          wikipediaData?.image || "",
          wikipediaData?.wikipediaUrl || ""
        );
      }
    } catch (error) {
      console.error(
        "Identification Error:",
        error
      );

      setMessage(
        "Unable to connect to the backend server."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // REMOVE IMAGE
  // ==============================

  const handleRemoveImage = () => {
    setImage(null);
    setFile(null);
    setResult("");
    setInfo(null);
    setMessage("");
  };

  // ==============================
  // SHOW LOGIN IF NOT LOGGED IN
  // ==============================

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // ==============================
  // MAIN APP
  // ==============================

  return (
    <div className="app">
      <div className="container">

        {/* HEADER */}

        <header className="header">
          <div className="logo">
            SnapID
          </div>

          <h1>
            Ek Photo, Poori Pehchaan
          </h1>

          <p className="main-description">
            Identify forts, plants and vehicles
            using AI
          </p>

          <p className="subtitle">
            Upload or capture a photo and let
            SnapID recognize it for you.
          </p>

          {/* USER SECTION */}

          <div className="user-area">
            <span className="user-name">
              Hi, {user?.name}
            </span>

            <button
              type="button"
              className="logout-btn"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        {/* UPLOAD SECTION */}

        <div className="upload-section">
          <div className="upload-icon">
            📸
          </div>

          <h2>
            Identify Anything
          </h2>

          <p className="upload-description">
            Upload an image or take a photo
            to get instant AI recognition.
          </p>

          <div className="upload-buttons">
            <label
              htmlFor="imageUpload"
              className="upload-btn"
            >
              📁 Upload Photo
            </label>

            <input
              id="imageUpload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              hidden
            />

            <button
              type="button"
              className="camera-btn"
              onClick={openCamera}
            >
              📷 Take Photo
            </button>
          </div>

          <p className="upload-hint">
            Supported formats: JPG, PNG, WEBP
          </p>
        </div>

        {/* CAMERA */}

        {cameraOpen && (
          <div className="camera-overlay">
            <div className="camera-modal">

              <div className="camera-header">
                <h2>
                  📷 Take Photo
                </h2>

                <button
                  type="button"
                  className="camera-close"
                  onClick={closeCamera}
                >
                  ✕
                </button>
              </div>

              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="camera-video"
              />

              <div className="camera-controls">
                <button
                  type="button"
                  className="capture-btn"
                  onClick={capturePhoto}
                >
                  📸 Capture
                </button>

                <button
                  type="button"
                  className="cancel-camera-btn"
                  onClick={closeCamera}
                >
                  Cancel
                </button>
              </div>

            </div>
          </div>
        )}

        {/* IMAGE PREVIEW */}

        {image && (
          <div className="preview">

            <div className="preview-header">
              <h2>
                Selected Image
              </h2>

              <button
                type="button"
                className="remove-btn"
                onClick={handleRemoveImage}
              >
                ✕ Remove
              </button>
            </div>

            <img
              src={image}
              alt="Selected"
            />

            <button
              type="button"
              className="identify-btn"
              onClick={handleIdentify}
              disabled={loading}
            >
              {loading
                ? "🤖 Identifying..."
                : "🔍 Identify Object"}
            </button>
          </div>
        )}

        {/* MESSAGE */}

        {message && (
          <div className="message">
            ⚠️ {message}
          </div>
        )}

        {/* AI RESULT */}

        {result && (
          <div className="result">
            <h2>
              🤖 Recognition Result
            </h2>

            <div className="result-card">
              {result
                .split("\n")
                .filter(
                  (line) =>
                    line.trim() !== ""
                )
                .map((line, index) => {
                  const [
                    label,
                    ...value
                  ] = line.split(":");

                  return (
                    <div
                      className="result-row"
                      key={index}
                    >
                      <strong>
                        {label}:
                      </strong>

                      <span>
                        {value
                          .join(":")
                          .trim()}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* INFO LOADING */}

        {infoLoading && (
          <div className="info-loading">
            <div className="loader"></div>

            <p>
              Fetching detailed information...
            </p>
          </div>
        )}

        {/* WIKIPEDIA INFO */}

        {info && (
          <div className="info-card">

            <div className="info-title">
              <span>
                📚
              </span>

              <h2>
                About {info.name}
              </h2>
            </div>

            {info.image && (
              <img
                src={info.image}
                alt={info.name}
                className="info-image"
              />
            )}

            {info.description && (
              <p className="info-description">
                {info.description}
              </p>
            )}

            {info.extract && (
              <p className="info-extract">
                {info.extract}
              </p>
            )}

            {info.wikipediaUrl && (
              <a
                href={info.wikipediaUrl}
                target="_blank"
                rel="noreferrer"
                className="wiki-btn"
              >
                Read More on Wikipedia →
              </a>
            )}

          </div>
        )}

        {/* HISTORY */}

        <History />

        {/* FOOTER */}

        <footer>
          <p>
            Powered by AI • SnapID
          </p>
        </footer>

      </div>
    </div>
  );
}

export default App;
