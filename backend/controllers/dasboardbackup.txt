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
    const { school_id } = req.query; // ✅ read from query params

    // ✅ Super Admin requesting specific school
    if (user.role === 'super_admin') {
      if (school_id) {
        // Find the selected school in central DB
        const school = await centralDb.collection('schools').findOne({ id: school_id });
        if (!school) return res.status(404).json({ detail: 'School not found' });

        const schoolDb = getSchoolDbByName(school.db_name);

        const total_students = await schoolDb.collection('students').countDocuments({});
        const total_teachers = await schoolDb.collection('teachers').countDocuments({});
        const total_classes = await schoolDb.collection('classes').countDocuments({});

        return res.json({
          total_students,
          total_teachers,
          total_classes,
          total_schools: await centralDb.collection('schools').countDocuments({}),
        });
      }

      // ✅ No school selected → show global summary
      const total_schools = await centralDb.collection('schools').countDocuments({});
      return res.json({ total_schools });
    }

    // ✅ For School Admins / Teachers — use their own school
    const school = await centralDb.collection('schools').findOne({ id: user.school_id });
    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const total_students = await schoolDb.collection('students').countDocuments({});
    const total_teachers = await schoolDb.collection('teachers').countDocuments({});
    const total_classes = await schoolDb.collection('classes').countDocuments({});

    return res.json({ total_students, total_teachers, total_classes });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = { getDashboardStats };
