const { getCentralDb, getSchoolDbByName } = require('../db');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');



const JWT_EXPIRATION_DAYS = parseInt(process.env.JWT_EXPIRATION_DAYS || '7', 10);

function isoPlusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
async function getDashboardStats(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();

    if (user.role === 'super_admin') {
      const total_schools = await centralDb.collection('schools').countDocuments({});
      return res.json({ total_schools });
    }

    const school = await centralDb.collection('schools').findOne({ id: user.school_id });
    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const total_students = await schoolDb.collection('students').countDocuments({});
    // const total_teachers = await schoolDb.collection('users').countDocuments({ role: 'teacher' });
    const total_teachers = await schoolDb.collection('teachers').countDocuments({});

    const total_classes = await schoolDb.collection('classes').countDocuments({});

    return res.json({ total_students, total_teachers, total_classes });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = { getDashboardStats };
