const { v4: uuidv4 } = require("uuid");
const { getCentralDb } = require("../db");

// CREATE
async function createSystemCode(req, res) {
  try {
    const user = req.user;
    if (user.role !== "super_admin") {
      return res
        .status(403)
        .json({ detail: "Only super admins can create system codes" });
    }

    const { system_code_id, codeId, description, items } = req.body;
    const finalId = system_code_id || codeId;

    if (!finalId || !description) {
      return res
        .status(400)
        .json({ detail: "system_code_id and description are required" });
    }

    const centralDb = getCentralDb();
    const id = uuidv4();

    const systemCode = {
      id,
      system_code_id: finalId,
      description,
      items: items || [], // ✅ fix here
      created_by: user.id,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await centralDb.collection("system_codes").insertOne(systemCode);
    res
      .status(201)
      .json({ message: "System code created successfully", data: systemCode });
  } catch (err) {
    console.error("❌ createSystemCode error:", err);
    res.status(500).json({ detail: "Failed to create system code" });
  }
}

// READ
async function getSystemCodes(req, res) {
  try {
    const centralDb = getCentralDb();
    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const total = await centralDb.collection("system_codes").countDocuments();
    const items = await centralDb
      .collection("system_codes")
      .find({})
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    res.json({ items, total });
  } catch (err) {
    console.error("❌ getSystemCodes error:", err);
    res.status(500).json({ detail: "Failed to fetch system codes" });
  }
}

// UPDATE
// UPDATE system code with line items
async function updateSystemCode(req, res) {
  try {
    const { id } = req.params;
    const { description, items } = req.body;
    const centralDb = getCentralDb();

    const updateFields = {
      ...(description && { description }),
      ...(items && { items }), // ✅ Save all line items, including active/inactive states
      updated_at: new Date(),
    };

    const result = await centralDb
      .collection("system_codes")
      .updateOne({ id }, { $set: updateFields });

    if (result.matchedCount === 0)
      return res.status(404).json({ detail: "System code not found" });

    res.json({ message: "System code updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "Failed to update system code" });
  }
}


// DELETE
async function deleteSystemCode(req, res) {
  try {
    const { id } = req.params;
    const centralDb = getCentralDb();

    await centralDb.collection("system_codes").deleteOne({ id });
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
