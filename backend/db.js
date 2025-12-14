// src/db.js
const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
const CENTRAL_DB_NAME = process.env.DB_NAME || "central_db";

if (!MONGO_URL) {
  throw new Error("❌ MONGO_URL missing in .env");
}

let client;
let centralDb;
let isConnected = false;

/**
 * Connect to MongoDB only once (connection pooling)
 */
async function connect() {
  try {
    if (!client) {
      client = new MongoClient(MONGO_URL, {
        maxPoolSize: 20,
      });
    }

    if (!isConnected) {
      await client.connect();
      console.log("✅ MongoDB Connected");
      isConnected = true;
      centralDb = client.db(CENTRAL_DB_NAME);
    }

    return { client, centralDb };
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}

/**
 * Get Central Database
 */
function getCentralDb() {
  if (!centralDb) throw new Error("❌ Central DB not connected. Call connect()");
  return centralDb;
}

/**
 * Get School DB using schoolId from central_db.schools collection
 */
async function getSchoolDbById(schoolId) {
  const db = getCentralDb();
  const school = await db.collection("schools").findOne(
    { id: schoolId },
    { projection: { _id: 0, db_name: 1 } }
  );

  if (!school) throw new Error("❌ School not found for ID: " + schoolId);

  return client.db(school.db_name);
}

/**
 * Get School DB using school code (used for subdomain/domains)
 */
async function getSchoolDbByCode(schoolCode) {
  const db = getCentralDb();
  const school = await db.collection("schools").findOne(
    { code: schoolCode },
    { projection: { _id: 0, db_name: 1 } }
  );

  if (!school) throw new Error("❌ School not found for code: " + schoolCode);

  return client.db(school.db_name);
}

/**
 * Get School DB using subdomain (e.g., "dps" from "dps.example.com")
 */
async function getSchoolDbBySubdomain(subdomain) {
  const db = getCentralDb();
  const school = await db.collection("schools").findOne(
    { subdomain: subdomain.toLowerCase() },
    { projection: { _id: 0, id: 1, db_name: 1, code: 1 } }
  );

  if (!school) throw new Error("❌ School not found for subdomain: " + subdomain);

  return { 
    db: client.db(school.db_name), 
    schoolCode: school.code,
    schoolId: school.id 
  };
}

/**
 * For cases where DB name is already known
 */
function getSchoolDbByName(dbName) {
  if (!client) throw new Error("❌ Client not initialized. Call connect()");
  return client.db(dbName);
}

/**
 * Check if connected
 */
function isDbConnected() {
  return isConnected;
}

/**
 * Close DB
 */
async function close() {
  if (client) {
    await client.close();
    isConnected = false;
    console.log("🔌 MongoDB connection closed");
  }
}

module.exports = {
  connect,
  getCentralDb,
  getSchoolDbById,
  getSchoolDbByCode,
  getSchoolDbBySubdomain,
  getSchoolDbByName,
  isDbConnected,
  close,
};
