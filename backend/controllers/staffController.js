// src/controllers/staffController.js
const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * Create a new staff member
 * POST /api/staff
 */
async function createStaff(req, res) {
  try {
    const user = req.user;

    if (user.role !== 'school_admin') {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const centralDb = getCentralDb();
    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const payload = {
      ...req.body,
      id: req.body.id || uuidv4(),
      created_at: new Date().toISOString(),
    };

    await schoolDb.collection('staff').insertOne(payload);

    return res.json(payload);
  } catch (err) {
    console.error('createStaff error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get all staff members for the school
 * GET /api/staff
 */
async function getAllStaff(req, res) {
  try {
    const user = req.user;

    const centralDb = getCentralDb();
    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const staff = await schoolDb
      .collection('staff')
      .find({}, { projection: { _id: 0 } })
      .toArray();

    return res.json(staff);
  } catch (err) {
    console.error('getAllStaff error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = { createStaff, getAllStaff };
