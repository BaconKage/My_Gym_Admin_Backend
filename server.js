// server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// ---------- Middleware ----------
app.use(
  cors({
    origin: "*", // later you can restrict to your frontend domain
  })
);
app.use(express.json());

// ---------- Config ----------
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not set in .env");
  process.exit(1);
}

// ---------- Connect to MongoDB ----------
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error connecting to MongoDB:", err.message);
    process.exit(1);
  });

// ---------- Simple health check ----------
app.get("/", (req, res) => {
  res.send("MyGym Admin Backend is running ✅");
});

/**
 * GET /api/meta
 * High-level metadata: collections + document counts
 */
app.get("/api/meta", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    const result = [];
    for (const coll of collections) {
      const collection = db.collection(coll.name);
      const count = await collection.estimatedDocumentCount();
      result.push({ name: coll.name, count });
    }

    res.json(result);
  } catch (err) {
    console.error("Error in /api/meta:", err);
    res.status(500).json({ error: "Failed to fetch metadata" });
  }
});

/**
 * GET /api/collections/:name
 * Generic endpoint to view documents from any collection
 * Example: /api/collections/dailysteps?limit=20&skip=0
 */
app.get("/api/collections/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;

    const db = mongoose.connection.db;
    const collection = db.collection(name);

    const docs = await collection
      .find({})
      .skip(skip)
      .limit(limit)
      .toArray();

    res.json(docs);
  } catch (err) {
    console.error("Error in /api/collections/:name:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

/**
 * GET /api/dashboard
 * Simple dashboard stats for your main cards
 * (all counts are approximations using estimatedDocumentCount)
 */
app.get("/api/dashboard", async (req, res) => {
  try {
    const db = mongoose.connection.db;

    const [
      activitiesCount,
      dailystepsCount,
      exercisesCount,
      challengesCount,
      cartsCount,
      conversationsCount,
    ] = await Promise.all([
      db.collection("activities").estimatedDocumentCount().catch(() => 0),
      db.collection("dailysteps").estimatedDocumentCount().catch(() => 0),
      db.collection("exercises").estimatedDocumentCount().catch(() => 0),
      db.collection("challenges").estimatedDocumentCount().catch(() => 0),
      db.collection("carts").estimatedDocumentCount().catch(() => 0),
      db.collection("conversations").estimatedDocumentCount().catch(() => 0),
    ]);

    res.json({
      totalActivities: activitiesCount,
      totalDailyStepsRecords: dailystepsCount,
      totalExercises: exercisesCount,
      activeChallenges: challengesCount, // later can filter by status
      openCarts: cartsCount,
      totalConversations: conversationsCount,
    });
  } catch (err) {
    console.error("Error in /api/dashboard:", err);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

/**
 * Example detail endpoints (optional now, useful later)
 * You can add more like:
 *  - /api/activity/recent
 *  - /api/dailysteps/recent
 *  - /api/challenges/active
 * But for now, /api/collections/:name is enough.
 */
