const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');


async function createTeacher(req, res) {
  try {
    const user = req.user;
    const { name, email, subjects, classes_assigned, fee_status, school_id } = req.body;

    if (!name) return res.status(400).json({ detail: 'Teacher name is required' });
    if (!email) return res.status(400).json({ detail: 'Email is required' });

    const centralDb = getCentralDb();

    // ✅ Determine target school
    let targetSchoolId = user.role === 'super_admin' ? school_id : user.school_id;
    if (!targetSchoolId) return res.status(400).json({ detail: 'School ID required' });

    const school = await centralDb.collection('schools').findOne({
      $or: [{ id: targetSchoolId }, { code: targetSchoolId }],
    });
    if (!school) return res.status(404).json({ detail: 'School not found' });

    // ✅ Get school DB
    const schoolDb = getSchoolDbByName(school.db_name);

    // ✅ Check if user with email already exists in that school
    const existingUser = await schoolDb.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ detail: 'A user with this email already exists in this school' });
    }

    // ✅ Create new user in school DB (without password)
    const newUser = {
      id: uuidv4(),
      name,
      email,
      role: 'teacher',
      school_id: school.id,
      is_active: true,
      password: null, // can be set later
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await schoolDb.collection('users').insertOne(newUser);

    // ✅ Prepare subjects/classes arrays
    const subjectsArray = Array.isArray(subjects) ? subjects : subjects ? [subjects] : [];
    const classesArray = Array.isArray(classes_assigned)
      ? classes_assigned
      : classes_assigned
      ? [classes_assigned]
      : [];

    // ✅ Create teacher profile (linked with user_id)
    const teacher = {
      id: uuidv4(),
      user_id: newUser.id,
      name,
      email,
      subjects: subjectsArray,
      classes_assigned: classesArray,
      fee_status: fee_status || 'Pending',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    await schoolDb.collection('teachers').insertOne(teacher);

    res.json({
      message: 'Teacher and user created successfully in school database',
      teacher,
      user: newUser,
    });
  } catch (err) {
    console.error('createTeacher error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}



// -------------------------
// Get all teachers
// -------------------------
// -------------------------
// Get all teachers
// -------------------------
async function getTeachers(req, res) {
  try {
    const user = req.user;
    const { name, subject, page = 1, limit = 10, school_id } = req.query;

    const centralDb = getCentralDb();
    let db;
    if (user.role === 'super_admin') {
      if (!school_id) return res.status(400).json({ detail: 'School ID required' });
      const school = await centralDb.collection('schools').findOne({
        $or: [{ id: school_id }, { code: school_id }]
      });
      if (!school) return res.status(404).json({ detail: 'School not found' });
      db = getSchoolDbByName(school.db_name);
    } else {
      const school = await centralDb.collection('schools').findOne({ id: user.school_id });
      db = getSchoolDbByName(school.db_name);
    }

    const query = {};
    if (name) query.name = { $regex: name, $options: 'i' };
    if (subject) query.subjects = { $elemMatch: { $regex: subject, $options: 'i' } };

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      db.collection('teachers').find(query).skip(skip).limit(Number(limit)).toArray(),
      db.collection('teachers').countDocuments(query),
    ]);

    res.json({ data, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('getTeachers error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

// -------------------------
// Update teacher details
// -------------------------
// -------------------------
// Update teacher
// -------------------------
async function updateTeacher(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;
    const { name, subjects, classes_assigned, fee_status, is_active } = req.body;

    const centralDb = getCentralDb();
    const school = await centralDb.collection('schools').findOne({ id: user.school_id });
    if (!school) return res.status(404).json({ detail: 'School not found' });

    const db = getSchoolDbByName(school.db_name);
    const updateData = {};

    if (name) updateData.name = name;
    if (subjects) updateData.subjects = Array.isArray(subjects) ? subjects : [subjects];
    if (classes_assigned) updateData.classes_assigned = Array.isArray(classes_assigned) ? classes_assigned : [classes_assigned];
    if (fee_status) updateData.fee_status = fee_status;
    if (is_active !== undefined) updateData.is_active = is_active;

    const result = await db.collection('teachers').updateOne({ id }, { $set: updateData });
    if (result.modifiedCount === 0) return res.status(404).json({ detail: 'Teacher not found' });

    res.json({ message: 'Teacher updated successfully' });
  } catch (err) {
    console.error('updateTeacher error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}


// -------------------------
// Delete teacher
// -------------------------
async function deleteTeacher(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;

    const centralDb = getCentralDb();
    const school = await centralDb.collection('schools').findOne({ id: user.school_id });
    if (!school) return res.status(404).json({ detail: 'School not found' });

    const db = getSchoolDbByName(school.db_name);
    const result = await db.collection('teachers').deleteOne({ id });
    if (result.deletedCount === 0) return res.status(404).json({ detail: 'Teacher not found' });

    res.json({ message: 'Teacher deleted successfully' });
  } catch (err) {
    console.error('deleteTeacher error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

// -------------------------
// Toggle teacher active/deactive
// -------------------------
async function toggleTeacherStatus(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;

    const centralDb = getCentralDb();
    const school = await centralDb.collection('schools').findOne({ id: user.school_id });
    if (!school) return res.status(404).json({ detail: 'School not found' });

    const db = getSchoolDbByName(school.db_name);

    const teacher = await db.collection('teachers').findOne({ id });
    if (!teacher) return res.status(404).json({ detail: 'Teacher not found' });

    const newStatus = !teacher.is_active;

    await db.collection('teachers').updateOne({ id }, { $set: { is_active: newStatus } });

    res.json({
      message: `Teacher ${newStatus ? 'activated' : 'deactivated'} successfully`,
      teacher: { ...teacher, is_active: newStatus },
    });
  } catch (err) {
    console.error('toggleTeacherStatus error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = {
  createTeacher,
  getTeachers,
  updateTeacher,
  deleteTeacher,
  toggleTeacherStatus,
};
