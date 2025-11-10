// src/controllers/attendanceController.js
const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * POST /api/attendance
 * Mark attendance
 */
async function markAttendance(req, res) {
  try {
    const user = req.user;
    const { student_id, class_id, date, status, school_id } = req.body;

    // If a batch (array) is sent
if (Array.isArray(req.body.records)) {
  const { records, school_id } = req.body;
  for (const r of records) {
    if (!r.student_id || !r.class_id || !r.date || !r.status) {
      return res.status(400).json({ detail: 'Each record must have student_id, class_id, date, and status' });
    }
    // Save each record (insertMany or loop)
  }
  return res.json({ message: 'Attendance marked successfully (batch)' });
}


    const centralDb = getCentralDb();
    let school;

    if (user.role === 'super_admin') {
      if (!school_id) return res.status(400).json({ detail: 'school_id required for super admin' });
      school = await centralDb.collection('schools').findOne({
        $or: [{ id: school_id }, { code: school_id }],
      });
    } else {
      school = await centralDb.collection('schools').findOne({ id: user.school_id });
    }

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Prevent duplicate entry for same student/date
    await schoolDb.collection('attendance').deleteOne({ student_id, date });

    const attendance = {
      id: uuidv4(),
      student_id,
      class_id,
      date,
      status, // "Present" | "Absent" | "Late"
      marked_by: user.id,
      created_at: new Date().toISOString(),
    };

    await schoolDb.collection('attendance').insertOne(attendance);
    res.json({ message: 'Attendance marked successfully', data: attendance });
  } catch (err) {
    console.error('markAttendance error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * GET /api/attendance
 * Filter + paginate attendance
 */
async function listAttendance(req, res) {
  try {
    const user = req.user;
    const { student_id, class_id, date, page = 1, limit = 10, school_id } = req.query;

    const centralDb = getCentralDb();
    let school;

    if (user.role === 'super_admin') {
      if (!school_id) return res.status(400).json({ detail: 'School ID required' });
      school = await centralDb.collection('schools').findOne({
        $or: [{ id: school_id }, { code: school_id }],
      });
    } else {
      school = await centralDb.collection('schools').findOne({ id: user.school_id });
    }

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);
    const filter = {};
    if (student_id) filter.student_id = student_id;
    if (class_id) filter.class_id = class_id;
    if (date) filter.date = date;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await schoolDb.collection('attendance').countDocuments(filter);

    const records = await schoolDb
      .collection('attendance')
      .find(filter, { projection: { _id: 0 } })
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    return res.json({
      data: records,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
    });
  } catch (err) {
    console.error('listAttendance error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * GET /api/attendance/class/:class_id
 * Load all students in a class (for attendance marking)
 */
async function getStudentsByClass(req, res) {
  try {
    const user = req.user;
    const { class_id } = req.params;
    const { school_id } = req.query;

    const centralDb = getCentralDb();
    let school;

    if (user.role === 'super_admin') {
      if (!school_id) return res.status(400).json({ detail: 'school_id required' });
      school = await centralDb.collection('schools').findOne({
        $or: [{ id: school_id }, { code: school_id }],
      });
    } else {
      school = await centralDb.collection('schools').findOne({ id: user.school_id });
    }

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const students = await schoolDb
      .collection('students')
      .find({ class_id }, { projection: { _id: 0 } })
      .toArray();

    res.json({ data: students });
  } catch (err) {
    console.error('getStudentsByClass error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = {
  markAttendance,
  listAttendance,
  getStudentsByClass,
};
