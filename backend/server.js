const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const History = require("./models/History.js");
const User = require("./models/User.js");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* ========================= MIDDLEWARE ========================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ========================= MONGODB CONNECTION ========================= */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch((error) => {
    console.error("❌ MongoDB Connection Error:", error);
  });

/* ========================= ROOT ROUTE ========================= */
app.get("/", (req, res) => {
  res.send("SnapID Backend Running");
});

/* ========================= MULTER CONFIGURATION (MEMORY) ========================= */
// Memory Storage use karne se Render disk error nahi aayega
const upload = multer({ storage: multer.memoryStorage() });

/* ========================= GEMINI AI SETUP ========================= */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
// FIXED MODEL NAME
// server.js
const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
async function generateWithRetry(contents) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await model.generateContent(contents);
    } catch (error) {
      lastError = error;

      console.log(`Gemini attempt ${attempt} failed:`, error.message);

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  throw lastError;
}
/* ========================= AI IDENTIFICATION ========================= */
app.post("/api/identify", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is not configured in server environment variables.",
      });
    }

    // Direct buffer processing (Fast & Safe on Render)
    const base64Image = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;

    const prompt = `
You are an AI object recognition system for an application called SnapID. Analyze the uploaded image and identify the main object. The object can belong to one of these categories:
1. Fort
2. Plant
3. Vehicle

Return ONLY the following format:
Category: <Fort / Plant / Vehicle>
Name: <specific object name>
Description: <short useful description>
Confidence: <number between 0 and 1>

Important:
- Try to identify the specific object.
- For a fort or monument, provide its commonly known name.
- For a plant, provide the most likely plant/species name.
- For a vehicle, provide the likely make/model if possible.
- Do not add extra text outside the required format.
`;

    const result = await generateWithRetry([
  {
    inlineData: {
      data: base64Image,
      mimeType: mimeType,
    },
  },
  prompt,
]);

    const response = await result.response;
    const text = response.text();

    console.log("AI Result:");
    console.log(text);

    res.json({
      success: true,
      result: text,
    });
  } catch (error) {
    console.error("AI Identification Error:", error);
    res.status(500).json({
      success: false,
      message: "AI identification failed",
      error: error.message,
    });
  }
});

/* ========================= WIKIPEDIA INFO ========================= */
app.get("/api/info", async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Object name is required",
      });
    }

    console.log("Wikipedia Search:", name);

    const searchUrl =
      `https://en.wikipedia.org/w/api.php` +
      `?action=query` +
      `&list=search` +
      `&srsearch=${encodeURIComponent(name)}` +
      `&format=json` +
      `&origin=*`;

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (
      !searchData.query ||
      !searchData.query.search ||
      searchData.query.search.length === 0
    ) {
      return res.json({
        success: false,
        message: "Wikipedia information not found",
      });
    }

    const pageTitle = searchData.query.search[0].title;
    const summaryUrl =
      `https://en.wikipedia.org/api/rest_v1/page/summary/` +
      encodeURIComponent(pageTitle);

    const summaryResponse = await fetch(summaryUrl);
    const summaryData = await summaryResponse.json();

    res.json({
      success: true,
      name: summaryData.title || pageTitle,
      description: summaryData.description || "",
      extract: summaryData.extract || "",
      image: summaryData.thumbnail?.source || "",
      wikipediaUrl:
        summaryData.content_urls?.desktop?.page ||
        `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
    });
  } catch (error) {
    console.error("Wikipedia Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch Wikipedia information",
      error: error.message,
    });
  }
});

/* ========================= AUTH - REGISTER ========================= */
app.post("/api/auth/register", async (req, res) => {
  try {
    console.log("Register Body:", req.body);
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
    });

    console.log("User Registered:", user.email);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
});

/* ========================= AUTH - LOGIN ========================= */
app.post("/api/auth/login", async (req, res) => {
  try {
    console.log("Login Body:", req.body);
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user || user.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    console.log("User Login:", user.email);

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
});

/* ========================= SAVE HISTORY ========================= */
app.post("/api/history", async (req, res) => {
  try {
    const {
      objectName,
      category,
      description,
      confidence,
      image,
      wikipediaUrl,
    } = req.body;

    if (!objectName || !category) {
      return res.status(400).json({
        success: false,
        message: "Object name and category are required",
      });
    }

    const history = await History.create({
      objectName,
      category,
      description: description || "",
      confidence: confidence || 0,
      image: image || "",
      wikipediaUrl: wikipediaUrl || "",
    });

    console.log("History Saved:", history._id);

    res.status(201).json({
      success: true,
      message: "History saved successfully",
      history,
    });
  } catch (error) {
    console.error("Save History Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save history",
      error: error.message,
    });
  }
});

/* ========================= GET HISTORY ========================= */
app.get("/api/history", async (req, res) => {
  try {
    console.log("Fetching recognition history...");
    const history = await History.find().sort({
      createdAt: -1,
    });

    console.log("History Count:", history.length);

    res.json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    console.error("Fetch History Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch history",
      error: error.message,
    });
  }
});

/* ========================= DELETE HISTORY ========================= */
app.delete("/api/history/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Deleting History ID:", id);

    const deletedHistory = await History.findByIdAndDelete(id);

    if (!deletedHistory) {
      return res.status(404).json({
        success: false,
        message: "History record not found",
      });
    }

    res.json({
      success: true,
      message: "History deleted successfully",
    });
  } catch (error) {
    console.error("Delete History Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete history",
      error: error.message,
    });
  }
});

/* ========================= 404 ROUTE ========================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* ========================= START SERVER ========================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
