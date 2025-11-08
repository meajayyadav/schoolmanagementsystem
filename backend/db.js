// src/db.js
const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || "central_db";

if (!MONGO_URL) {
  throw new Error("❌ MONGO_URL not set in .env");
}

const client = new MongoClient(MONGO_URL, {
  serverApi: {
    version: "1",
    strict: true,
    deprecationErrors: true,
  },
});

let centralDb;

async function connect() {
  try {
    if (!client.topology || client.topology.isDestroyed()) {
      await client.connect();
      console.log("✅ Connected to MongoDB");
    }
    centralDb = client.db(DB_NAME);
    return { client, centralDb };
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}

function getCentralDb() {
  if (!centralDb) throw new Error("Database not connected. Call connect() first.");
  return centralDb;
}

async function getSchoolDbById(schoolId) {
  const db = getCentralDb();
  const school = await db
    .collection("schools")
    .findOne({ id: schoolId }, { projection: { _id: 0 } });

  if (!school) throw new Error("School not found");
  return client.db(school.db_name);
}

function getSchoolDbByName(dbName) {
  return client.db(dbName);
}

async function close() {
  await client.close();
  console.log("🔌 MongoDB connection closed");
}

module.exports = { connect, getCentralDb, getSchoolDbById, getSchoolDbByName, close };
