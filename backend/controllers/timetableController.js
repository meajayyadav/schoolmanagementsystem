// src/controllers/timetableController.js
const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * Create a new timetable entry
 * POST /api/timetable
 */
async function createTimetable(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();

    // Determine target school
    let schoolId = req.body.school_id || user.school_id;
    if (!schoolId && user.role !== 'super_admin') {
      return res.status(400).json({ detail: 'School ID required' });
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ id: schoolId }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const payload = {
      ...req.body,
      id: req.body.id || uuidv4(),
      school_id: schoolId,
      created_at: new Date().toISOString(),
    };

    await schoolDb.collection('timetable').insertOne(payload);
    return res.json(payload);
  } catch (err) {
    console.error('createTimetable error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get timetable for a specific class (single school)
 * GET /api/timetable/class/:class_id
 */
async function getTimetableByClass(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();

    // 🟢 Super admin can access any school’s timetable
    const schoolId = req.query.school_id || user.school_id;
    if (!schoolId) return res.status(400).json({ detail: 'School ID required' });

    const school = await centralDb
      .collection('schools')
      .findOne({ id: schoolId }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const timetable = await schoolDb
      .collection('timetable')
      .find({ class_id: req.params.class_id }, { projection: { _id: 0 } })
      .toArray();

    return res.json(timetable);
  } catch (err) {
    console.error('getTimetableByClass error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * 🆕 Get all timetables (super admin only)
 * GET /api/timetable
 */
async function getAllTimetables(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'super_admin')
      return res.status(403).json({ detail: 'Access denied' });

    const centralDb = getCentralDb();
    const schools = await centralDb
      .collection('schools')
      .find({}, { projection: { _id: 0, id: 1, name: 1, db_name: 1 } })
      .toArray();

    let allTimetables = [];

    for (const school of schools) {
      const schoolDb = getSchoolDbByName(school.db_name);
      const timetable = await schoolDb
        .collection('timetable')
        .find({}, { projection: { _id: 0 } })
        .toArray();
      allTimetables.push(...timetable.map(t => ({ ...t, school_name: school.name })));
    }

    return res.json(allTimetables);
  } catch (err) {
    console.error('getAllTimetables error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = { createTimetable, getTimetableByClass, getAllTimetables };
