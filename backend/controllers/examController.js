// src/controllers/examController.js
const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * POST /api/exams
 * Create a new exam
 */
async function createExam(req, res) {
  try {
    const user = req.user;

    if (user.role !== 'school_admin') {
      return res.status(403).json({ detail: 'Access denied: only school admins can create exams' });
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
      created_by: user.id,
    };

    await schoolDb.collection('exams').insertOne(payload);
    return res.json(payload);
  } catch (err) {
    console.error('createExam error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * GET /api/exams
 * Get list of exams
 */
async function getExams(req, res) {
  try {
    const user = req.user;

    const centralDb = getCentralDb();

    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const exams = await schoolDb
      .collection('exams')
      .find({}, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .toArray();

    return res.json(exams);
  } catch (err) {
    console.error('getExams error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * GET /api/exams/:exam_id
 * Get a single exam by ID
 */
async function getExamById(req, res) {
  try {
    const user = req.user;
    const { exam_id } = req.params;

    const centralDb = getCentralDb();

    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const exam = await schoolDb
      .collection('exams')
      .findOne({ id: exam_id }, { projection: { _id: 0 } });

    if (!exam) return res.status(404).json({ detail: 'Exam not found' });

    return res.json(exam);
  } catch (err) {
    console.error('getExamById error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * DELETE /api/exams/:exam_id
 * Delete an exam
 */
async function deleteExam(req, res) {
  try {
    const user = req.user;

    if (user.role !== 'school_admin') {
      return res.status(403).json({ detail: 'Only school admins can delete exams' });
    }

    const { exam_id } = req.params;
    const centralDb = getCentralDb();

    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const result = await schoolDb.collection('exams').deleteOne({ id: exam_id });

    if (result.deletedCount === 0)
      return res.status(404).json({ detail: 'Exam not found or already deleted' });

    return res.json({ detail: 'Exam deleted successfully' });
  } catch (err) {
    console.error('deleteExam error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = {
  createExam,
  getExams,
  getExamById,
  deleteExam,
};
