// src/controllers/reportCardController.js
const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * Create a new report card
 * POST /api/report-cards
 */
async function createReportCard(req, res) {
  try {
    const user = req.user;

    if (!['school_admin', 'teacher'].includes(user.role)) {
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
      generated_at: new Date().toISOString(),
    };

    await schoolDb.collection('report_cards').insertOne(payload);

    return res.json(payload);
  } catch (err) {
    console.error('createReportCard error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get report cards of a specific student
 * GET /api/report-cards/student/:student_id
 */
async function getStudentReportCards(req, res) {
  try {
    const user = req.user;
    const { student_id } = req.params;

    const centralDb = getCentralDb();
    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const reports = await schoolDb
      .collection('report_cards')
      .find({ student_id }, { projection: { _id: 0 } })
      .toArray();

    return res.json(reports);
  } catch (err) {
    console.error('getStudentReportCards error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = {
  createReportCard,
  getStudentReportCards,
};
