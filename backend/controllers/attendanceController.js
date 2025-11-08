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
    if (!['teacher', 'school_admin'].includes(user.role)) {
      return res.status(403).json({ detail: 'Only teachers or school admins can mark attendance' });
    }

    const centralDb = getCentralDb();
    const school = await centralDb.collection('schools').findOne({ id: user.school_id });
    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);
    const { student_id, class_id, date, status } = req.body;

    if (!student_id || !class_id || !date || !status) {
      return res.status(400).json({ detail: 'student_id, class_id, date, and status are required' });
    }

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
 * Supports filtering and pagination
 * Query: student_id, class_id, date, page, limit, school_id (for super_admin)
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

module.exports = {
  markAttendance,
  listAttendance,
};
