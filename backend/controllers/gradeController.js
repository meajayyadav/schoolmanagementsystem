// src/controllers/gradeController.js
const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * Helper: resolve school DB based on user role + optional school_id
 */
async function resolveSchoolDb(user, providedSchoolId) {
  const centralDb = getCentralDb();
  let targetSchoolId = user.role === 'super_admin' ? providedSchoolId : user.school_id;
  if (!targetSchoolId) return { error: { status: 400, body: { detail: 'School ID required' } } };

  const school = await centralDb.collection('schools').findOne({
    $or: [{ id: targetSchoolId }, { code: targetSchoolId }],
  });

  if (!school) return { error: { status: 404, body: { detail: 'School not found' } } };

  const schoolDb = getSchoolDbByName(school.db_name);
  return { school, schoolDb };
}

/**
 * POST /api/grades
 * Add a new grade (teacher or school_admin). super_admin must send school_id in body.
 */
async function addGrade(req, res) {
  try {
    const user = req.user;
    if (!['teacher', 'school_admin', 'super_admin'].includes(user.role)) {
      return res.status(403).json({ detail: 'Only teachers, school admins or super admins can add grades' });
    }

    const {
      student_id,
      class_id,
      subject,
      score,
      max_score,
      grade,
      remarks = '',
      date,
      school_id, // optional for super_admin
    } = req.body;

    if (!student_id || !class_id || !subject || score === undefined || max_score === undefined || !date) {
      return res.status(400).json({ detail: 'student_id, class_id, subject, score, max_score and date are required' });
    }

    const { error, schoolDb } = await resolveSchoolDb(user, school_id);
    if (error) return res.status(error.status).json(error.body);

    const payload = {
      id: uuidv4(),
      student_id,
      class_id,
      subject,
      score: Number(score),
      max_score: Number(max_score),
      grade: grade || null,
      remarks,
      date, // ISO date or 'YYYY-MM-DD'
      marked_by: user.id,
      created_at: new Date().toISOString(),
    };

    await schoolDb.collection('grades').insertOne(payload);
    return res.json({ message: 'Grade added', data: payload });
  } catch (err) {
    console.error('addGrade error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * GET /api/grades
 * List grades with filters & pagination
 * Query params:
 *   student_id, class_id, subject, date, page, limit, school_id (for super_admin)
 */
async function listGrades(req, res) {
  try {
    const user = req.user;
    const { student_id, class_id, subject, date, page = 1, limit = 10, school_id } = req.query;

    const { error, schoolDb } = await resolveSchoolDb(user, school_id);
    if (error) return res.status(error.status).json(error.body);

    const filter = {};
    if (student_id) filter.student_id = student_id;
    if (class_id) filter.class_id = class_id;
    if (subject) filter.subject = { $regex: subject, $options: 'i' };
    if (date) filter.date = date;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await schoolDb.collection('grades').countDocuments(filter);

    const data = await schoolDb
      .collection('grades')
      .find(filter, { projection: { _id: 0 } })
      .sort({ date: -1, created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .toArray();

    return res.json({
      data,
      total,
      totalPages: Math.ceil(total / parseInt(limit, 10)) || 1,
      currentPage: parseInt(page, 10),
    });
  } catch (err) {
    console.error('listGrades error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * GET /api/grades/student/:student_id
 * Get all grades for a specific student (optional pagination could be added)
 * super_admin must supply ?school_id=...
 */
async function getGradesByStudent(req, res) {
  try {
    const user = req.user;
    const { student_id } = req.params;
    const { school_id } = req.query;

    if (!student_id) return res.status(400).json({ detail: 'student_id is required' });

    const { error, schoolDb } = await resolveSchoolDb(user, school_id);
    if (error) return res.status(error.status).json(error.body);

    const grades = await schoolDb
      .collection('grades')
      .find({ student_id }, { projection: { _id: 0 } })
      .sort({ date: -1, created_at: -1 })
      .toArray();

    return res.json({ data: grades });
  } catch (err) {
    console.error('getGradesByStudent error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = {
  addGrade,
  listGrades,
  getGradesByStudent,
};
