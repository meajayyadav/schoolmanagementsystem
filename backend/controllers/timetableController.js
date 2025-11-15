// src/controllers/timetableController.js
const { v4: uuidv4 } = require('uuid');
const { ObjectId } = require('mongodb');
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * Create a new timetable entry
 * POST /api/timetable
 */
// In your backend timetableController.js - update the create function
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

    // Get teacher name if teacher_id is provided
    let teacherName = req.body.teacher_name || '';
    if (req.body.teacher_id && !teacherName) {
      const teacher = await schoolDb
        .collection('teachers')
        .findOne({ id: req.body.teacher_id }, { projection: { _id: 0, name: 1, first_name: 1, last_name: 1 } });
      
      if (teacher) {
        teacherName = teacher.name || 
                     (teacher.first_name && teacher.last_name ? `${teacher.first_name} ${teacher.last_name}` : 
                     teacher.first_name || '');
      }
    }

    const payload = {
      ...req.body,
      id: req.body.id || uuidv4(),
      school_id: schoolId,
      teacher_name: teacherName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await schoolDb.collection('timetable').insertOne(payload);
    return res.status(201).json(payload);
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

    // 🟢 Super admin can access any school's timetable
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

/**
 * Get a single timetable entry by ID
 * GET /api/timetable/:id
 */
async function getTimetableById(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();

    const schoolId = req.query.school_id || user.school_id;
    if (!schoolId) return res.status(400).json({ detail: 'School ID required' });

    const school = await centralDb
      .collection('schools')
      .findOne({ id: schoolId }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const timetable = await schoolDb
      .collection('timetable')
      .findOne({ id: req.params.id }, { projection: { _id: 0 } });

    if (!timetable) return res.status(404).json({ detail: 'Timetable entry not found' });

    return res.json(timetable);
  } catch (err) {
    console.error('getTimetableById error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Update a timetable entry
 * PUT /api/timetable/:id
 */
async function updateTimetable(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();

    const schoolId = req.body.school_id || user.school_id;
    if (!schoolId) return res.status(400).json({ detail: 'School ID required' });

    const school = await centralDb
      .collection('schools')
      .findOne({ id: schoolId }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Check if timetable entry exists
    const existingTimetable = await schoolDb
      .collection('timetable')
      .findOne({ id: req.params.id }, { projection: { _id: 0 } });

    if (!existingTimetable) return res.status(404).json({ detail: 'Timetable entry not found' });

    // Update the timetable entry
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString(),
    };

    // Remove id from update data to prevent changing the ID
    delete updateData.id;
    delete updateData.created_at;

    const result = await schoolDb
      .collection('timetable')
      .updateOne(
        { id: req.params.id },
        { $set: updateData }
      );

    if (result.modifiedCount === 0) {
      return res.status(400).json({ detail: 'No changes made to timetable entry' });
    }

    // Return updated timetable entry
    const updatedTimetable = await schoolDb
      .collection('timetable')
      .findOne({ id: req.params.id }, { projection: { _id: 0 } });

    return res.json(updatedTimetable);
  } catch (err) {
    console.error('updateTimetable error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Delete a timetable entry
 * DELETE /api/timetable/:id
 */
async function deleteTimetable(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();

    const schoolId = req.query.school_id || user.school_id;
    if (!schoolId) return res.status(400).json({ detail: 'School ID required' });

    const school = await centralDb
      .collection('schools')
      .findOne({ id: schoolId }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Check if timetable entry exists
    const existingTimetable = await schoolDb
      .collection('timetable')
      .findOne({ id: req.params.id }, { projection: { _id: 0 } });

    if (!existingTimetable) return res.status(404).json({ detail: 'Timetable entry not found' });

    // Delete the timetable entry
    const result = await schoolDb
      .collection('timetable')
      .deleteOne({ id: req.params.id });

    if (result.deletedCount === 0) {
      return res.status(400).json({ detail: 'Failed to delete timetable entry' });
    }

    return res.status(200).json({ 
      message: 'Timetable entry deleted successfully',
      deleted_entry: existingTimetable
    });
  } catch (err) {
    console.error('deleteTimetable error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get timetable by multiple criteria (day, teacher, subject, etc.)
 * GET /api/timetable/filter
 */
async function getTimetableByFilter(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();

    const schoolId = req.query.school_id || user.school_id;
    if (!schoolId) return res.status(400).json({ detail: 'School ID required' });

    const school = await centralDb
      .collection('schools')
      .findOne({ id: schoolId }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Build filter based on query parameters
    const filter = {};
    if (req.query.class_id) filter.class_id = req.query.class_id;
    if (req.query.day) filter.day = req.query.day;
    if (req.query.teacher_id) filter.teacher_id = req.query.teacher_id;
    if (req.query.subject) filter.subject = req.query.subject;

    const timetable = await schoolDb
      .collection('timetable')
      .find(filter, { projection: { _id: 0 } })
      .toArray();

    return res.json(timetable);
  } catch (err) {
    console.error('getTimetableByFilter error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = { 
  createTimetable, 
  getTimetableByClass, 
  getAllTimetables,
  getTimetableById,
  updateTimetable,
  deleteTimetable,
  getTimetableByFilter
};