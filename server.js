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

// ---------- Allowed collections for explorer ----------
const IMPORTANT_COLLECTIONS = [
  "activities",
  "activityfeeds",
  "attendances",
  "auditlogs",
  "audittrails",
  "blogs",
  "bmrs",
  "carts",
  "certifications",
  "challenges",
  "challengesworks",
  "chatmembers",
  "commonpages",
  "conversations",
  "createmembershiptokens",
  "dailysteps",
  "exercisecategories",
  "exerciselevels",
  "exercises",
  "exercisesubcategories",
  "users",
  "gyms",
  "leads",
  "gymaudittrails",
  "memberships",
  "gymtrainerclasses",
  "freezedinfos",
  "foods",
  "notifications",
  "tickets",
  "videorooms",
];

// ---------- /api/meta : high-level counts ----------
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

// ---------- /api/collections/:name : paginated docs ----------
/**
 * GET /api/collections/:name
 * Generic endpoint to view documents from allowed collections
 * Example: /api/collections/dailysteps?page=1&limit=20
 */
app.get("/api/collections/:name", async (req, res) => {
  try {
    const { name } = req.params;
    console.log("Requested collection:", name);

    // Only allow whitelisted collections
    if (!IMPORTANT_COLLECTIONS.includes(name)) {
      return res.status(400).json({ error: "Collection not allowed" });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const db = mongoose.connection.db;
    const collection = db.collection(name);

    const [docs, total] = await Promise.all([
      collection
        .find({})
        .sort({ _id: -1 }) // newest first
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.estimatedDocumentCount(),
    ]);

    res.json({
      name,
      page,
      limit,
      total,
      docs,
    });
  } catch (err) {
    console.error("Error in /api/collections/:name:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// ---------- /api/dashboard : main cards stats ----------
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
      usersCount,
      gymsCount,
      leadsCount,
      gymAuditTrailsCount,
      membershipsCount,
      gymTrainerClassesCount,
      freezedInfosCount,
      foodsCount,
      notificationsCount,
      ticketsCount,
      videoRoomsCount,
    ] = await Promise.all([
      db.collection("activities").estimatedDocumentCount().catch(() => 0),
      db.collection("dailysteps").estimatedDocumentCount().catch(() => 0),
      db.collection("exercises").estimatedDocumentCount().catch(() => 0),
      db.collection("challenges").estimatedDocumentCount().catch(() => 0),
      db.collection("carts").estimatedDocumentCount().catch(() => 0),
      db.collection("conversations").estimatedDocumentCount().catch(() => 0),
      db.collection("users").estimatedDocumentCount().catch(() => 0),
      db.collection("gyms").estimatedDocumentCount().catch(() => 0),
      db.collection("leads").estimatedDocumentCount().catch(() => 0),
      db.collection("gymaudittrails").estimatedDocumentCount().catch(() => 0),
      db.collection("memberships").estimatedDocumentCount().catch(() => 0),
      db.collection("gymtrainerclasses").estimatedDocumentCount().catch(() => 0),
      db.collection("freezedinfos").estimatedDocumentCount().catch(() => 0),
      db.collection("foods").estimatedDocumentCount().catch(() => 0),
      db.collection("notifications").estimatedDocumentCount().catch(() => 0),
      db.collection("tickets").estimatedDocumentCount().catch(() => 0),
      db.collection("videorooms").estimatedDocumentCount().catch(() => 0),
    ]);

    res.json({
      // existing fields (used by current dashboard cards)
      totalActivities: activitiesCount,
      totalDailyStepsRecords: dailystepsCount,
      totalExercises: exercisesCount,
      activeChallenges: challengesCount,
      openCarts: cartsCount,
      totalConversations: conversationsCount,

      // extra stats you can wire up later in UI
      totalUsers: usersCount,
      totalGyms: gymsCount,
      totalLeads: leadsCount,
      totalGymAuditTrails: gymAuditTrailsCount,
      totalMemberships: membershipsCount,
      totalGymTrainerClasses: gymTrainerClassesCount,
      totalFreezedInfos: freezedInfosCount,
      totalFoods: foodsCount,
      totalNotifications: notificationsCount,
      totalTickets: ticketsCount,
      totalVideoRooms: videoRoomsCount,
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

