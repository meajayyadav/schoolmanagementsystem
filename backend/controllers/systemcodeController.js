const { v4: uuidv4 } = require("uuid");
const { getCentralDb, getSchoolDbByName } = require("../db");

/**
 * CREATE — Super Admin only, for a specific school
 */
/**
 * Create System Code
 * - Super Admin selects school → code created in that school’s DB
 */
async function createSystemCode(req, res) {
  try {
    const user = req.user;
    const { school_id, code, description, items } = req.body;

    if (user.role !== "super_admin") {
      return res.status(403).json({ detail: "Only super admins can create system codes" });
    }

    if (!school_id || !code) {
      return res.status(400).json({ detail: "school_id and system_code_id are required" });
    }

    const centralDb = getCentralDb();
    const school = await centralDb.collection("schools").findOne({ id: school_id });
    if (!school) return res.status(404).json({ detail: "School not found" });

    const schoolDb = getSchoolDbByName(school.db_name);

    const existing = await schoolDb
      .collection("system_codes")
      .findOne({ code });

    if (existing) {
      return res.status(400).json({ detail: "System code already exists in this school" });
    }

    const sysCode = {
      id: uuidv4(),
      school_id,
      code,
      description: description || "",
      items: Array.isArray(items) ? items : [],
      created_at: new Date(),
    };

    await schoolDb.collection("system_codes").insertOne(sysCode);
    res.json(sysCode);
  } catch (err) {
    console.error("❌ createSystemCode error:", err);
    res.status(500).json({ detail: "Failed to create system code" });
  }
}


/**
 * Get System Codes for a School
 * - Works for both school admins and super admins
 */
async function getSystemCodes(req, res) {
  try {
    const user = req.user;
    const schoolId = req.query.school_id || user.school_id;

    if (!schoolId)
      return res.status(400).json({ detail: "school_id is required" });

    const centralDb = getCentralDb();
    const school = await centralDb.collection("schools").findOne({ id: schoolId });
    if (!school) return res.status(404).json({ detail: "School not found" });

    const schoolDb = getSchoolDbByName(school.db_name);
    const codes = await schoolDb.collection("system_codes").find({}).toArray();

    res.json(codes);
  } catch (err) {
    console.error("❌ getSystemCodes error:", err);
    res.status(500).json({ detail: "Failed to fetch system codes" });
  }
}



/**
 * UPDATE — Super Admin only, for a specific school
 */
async function updateSystemCode(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;
    const { school_id, description, items } = req.body;

    if (user.role !== "super_admin") {
      return res.status(403).json({ detail: "Only super admins can update system codes" });
    }

    if (!school_id) return res.status(400).json({ detail: "school_id is required" });

    const centralDb = getCentralDb();
    const school = await centralDb.collection("schools").findOne({ id: school_id });
    if (!school) return res.status(404).json({ detail: "School not found" });

    const schoolDb = getSchoolDbByName(school.db_name);

    const result = await schoolDb.collection("system_codes").updateOne(
      { id },
      {
        $set: {
          description,
          items: Array.isArray(items) ? items : [],
          updated_at: new Date(),
        },
      }
    );

    if (result.matchedCount === 0)
      return res.status(404).json({ detail: "System code not found" });

    res.json({ message: "System code updated successfully" });
  } catch (err) {
    console.error("❌ updateSystemCode error:", err);
    res.status(500).json({ detail: "Failed to update system code" });
  }
}



/**
 * DELETE — Super Admin only, for a specific school
 */
async function deleteSystemCode(req, res) {
  try {
    const user = req.user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ detail: "Only super admins can delete system codes" });
    }

    const { id } = req.params;
    const { school_id } = req.query;

    if (!school_id)
      return res.status(400).json({ detail: "school_id is required" });

    const centralDb = getCentralDb();
    const school = await centralDb.collection("schools").findOne({ id: school_id });
    if (!school) return res.status(404).json({ detail: "School not found" });

    const schoolDb = getSchoolDbByName(school.db_name);
    await schoolDb.collection("system_codes").deleteOne({ id });

    res.json({ message: "System code deleted successfully" });
  } catch (err) {
    console.error("❌ deleteSystemCode error:", err);
    res.status(500).json({ detail: "Failed to delete system code" });
  }
}

module.exports = {
  createSystemCode,
  getSystemCodes,
  updateSystemCode,
  deleteSystemCode,
};
