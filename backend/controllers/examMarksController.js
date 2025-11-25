// src/controllers/examMarksController.js
const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');

// src/controllers/examMarksController.js
// In examMarksController.js - update getStudentsForMarks function

/**
 * Get students for marks entry
 * GET /api/exam-marks/students
 */
async function getStudentsForMarks(req, res) {
  try {
    const user = req.user;
    const { academic_year, exam_type, class_id, section, subject_id, school_id, actual_exam_id } = req.query;

    console.log('Received filters for students:', {
      academic_year,
      exam_type,
      class_id,
      section,
      subject_id,
      school_id,
      actual_exam_id
    });

    if (!academic_year || !exam_type || !class_id || !section || !subject_id) {
      return res.status(400).json({ detail: 'Missing required filters' });
    }

    const centralDb = getCentralDb();
    
    // Determine which school to use
    let targetSchoolId = user.school_id;
    
    // If super admin is providing school_id, use that
    if (user.role === 'super_admin' && school_id) {
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ id: targetSchoolId }, { projection: { _id: 0, db_name: 1 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Get students for the class and section - FIXED QUERY
    const students = await schoolDb
      .collection('students')
      .find({ 
        class_id: class_id,
        class_section: section
      }, { 
        projection: { 
          _id: 0, 
          id: 1, 
          roll_number: 1, 
          name: 1,
          class_id: 1,
          class_section: 1
        } 
      })
      .sort({ roll_number: 1 })
      .toArray();

    console.log('Found students:', students);

    // Use actual_exam_id if provided, otherwise use exam_type
    const examIdToUse = actual_exam_id || exam_type;

    // Check for existing marks - use the correct exam ID
    const existingMarks = await schoolDb
      .collection('exam_marks')
      .find({
        academic_year: academic_year,
        exam_type: examIdToUse, // Use the actual exam ID
        class_id: class_id,
        section: section,
        subject_id: subject_id
      }, {
        projection: { 
          _id: 0, 
          student_id: 1, 
          theory_marks: 1, 
          practical_marks: 1, 
          project_marks: 1, 
          oral_marks: 1, 
          remarks: 1 
        }
      })
      .toArray();

    console.log('Found existing marks with exam_id:', examIdToUse, existingMarks);

    // Format students data to match expected frontend format
    const formattedStudents = students.map(student => ({
      id: student.id,
      roll_number: student.roll_number,
      full_name: student.name,
      class_id: student.class_id,
      section: student.class_section
    }));

    return res.json({
      students: formattedStudents,
      existingMarks
    });
  } catch (err) {
    console.error('getStudentsForMarks error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
/**
 * Get mark distribution for subject
 */
// In examMarksController.js - update getMarkDistribution function

/**
 * Get mark distribution for subject
 * GET /api/exam-marks/distribution
 */
async function getMarkDistribution(req, res) {
  try {
    const user = req.user;
    const { subject_id, exam_type, class_id, school_id, actual_exam_id } = req.query;

    console.log('Mark distribution request:', {
      subject_id,
      exam_type,
      class_id,
      school_id,
      actual_exam_id
    });

    const centralDb = getCentralDb();
    
    // Determine which school to use
    let targetSchoolId = user.school_id;
    
    // If super admin is providing school_id, use that
    if (user.role === 'super_admin' && school_id) {
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ id: targetSchoolId }, { projection: { _id: 0, db_name: 1 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Use actual_exam_id if provided, otherwise use exam_type
    const examIdToUse = actual_exam_id || exam_type;

    // Get subject mark distribution
    const distribution = await schoolDb
      .collection('subject_mark_distribution')
      .findOne({
        subject_id,
        exam_type: examIdToUse, // Use the actual exam ID
        class_id
      }, {
        projection: { _id: 0 }
      });

    console.log('Found distribution:', distribution);

    // Default distribution if not found
    const defaultDistribution = {
      max_marks: 100,
      theory_max: 80,
      practical_max: 20,
      project_max: 0,
      oral_max: 0
    };

    return res.json(distribution || defaultDistribution);
  } catch (err) {
    console.error('getMarkDistribution error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Save exam marks
 * POST /api/exam-marks
 */
async function saveMarks(req, res) {
  try {
    const user = req.user;
    const { academic_year, exam_type, class_id, section, subject_id, marks, mark_distribution, school_id } = req.body;

    if (!academic_year || !exam_type || !class_id || !section || !subject_id || !marks) {
      return res.status(400).json({ detail: 'Missing required fields' });
    }

    const centralDb = getCentralDb();
    
    // Determine which school to use
    let targetSchoolId = user.school_id;
    
    // If super admin is providing school_id, use that
    if (user.role === 'super_admin' && school_id) {
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ id: targetSchoolId }, { projection: { _id: 0, db_name: 1 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const timestamp = new Date().toISOString();
    const marksWithMeta = marks.map(mark => ({
      ...mark,
      id: uuidv4(),
      academic_year,
      exam_type,
      class_id,
      section,
      subject_id,
      school_id: targetSchoolId, // Store school_id with marks
      created_by: user.id,
      created_at: timestamp,
      updated_at: timestamp
    }));

    // Insert marks
    const result = await schoolDb.collection('exam_marks').insertMany(marksWithMeta);

    return res.json({ 
      message: 'Marks saved successfully',
      saved_count: result.insertedCount
    });
  } catch (err) {
    console.error('saveMarks error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
async function getFilters(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();
    
    // Get school info
    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0, db_name: 1 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Get academic years
    const academicYears = await schoolDb
      .collection('academic_years')
      .find({}, { projection: { _id: 0, name: 1 } })
      .toArray();

    // Get exam types
    const examTypes = await schoolDb
      .collection('exam_types')
      .find({}, { projection: { _id: 0, id: 1, name: 1 } })
      .toArray();

    // Get classes
    const classes = await schoolDb
      .collection('classes')
      .find({}, { projection: { _id: 0, id: 1, name: 1 } })
      .toArray();

    // Get sections
    const sections = await schoolDb
      .collection('sections')
      .distinct('name');

    // Get subjects
    const subjects = await schoolDb
      .collection('subjects')
      .find({}, { projection: { _id: 0, id: 1, name: 1 } })
      .toArray();

    return res.json({
      academicYears: academicYears.map(ay => ay.name),
      examTypes,
      classes,
      sections,
      subjects
    });
  } catch (err) {
    console.error('getFilters error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
// Keep other functions the same but add school_id handling similar to above

/**
 * Save bulk exam marks
 * POST /api/exam-marks/bulk
 */
async function saveBulkMarks(req, res) {
  try {
    const user = req.user;
    const { marks } = req.body; // Array of marks with all required fields

    if (!marks || !Array.isArray(marks)) {
      return res.status(400).json({ detail: 'Marks array is required' });
    }

    const centralDb = getCentralDb();
    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0, db_name: 1 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const timestamp = new Date().toISOString();
    const marksWithMeta = marks.map(mark => ({
      ...mark,
      id: uuidv4(),
      created_by: user.id,
      created_at: timestamp,
      updated_at: timestamp
    }));

    // Insert marks
    const result = await schoolDb.collection('exam_marks').insertMany(marksWithMeta);

    return res.json({ 
      message: 'Bulk marks saved successfully',
      saved_count: result.insertedCount
    });
  } catch (err) {
    console.error('saveBulkMarks error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get existing marks for editing
 * GET /api/exam-marks
 */
async function getExistingMarks(req, res) {
  try {
    const user = req.user;
    const { academic_year, exam_type, class_id, section, subject_id } = req.query;

    if (!academic_year || !exam_type || !class_id || !section || !subject_id) {
      return res.status(400).json({ detail: 'Missing required filters' });
    }

    const centralDb = getCentralDb();
    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0, db_name: 1 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const marks = await schoolDb
      .collection('exam_marks')
      .find({
        academic_year,
        exam_type,
        class_id,
        section,
        subject_id
      }, {
        projection: { _id: 0 }
      })
      .toArray();

    return res.json(marks);
  } catch (err) {
    console.error('getExistingMarks error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
/**
 * Check exam scheduled status
 * GET /api/exam-marks/check-status
 */
/**
 * Check exam scheduled status
 * GET /api/exam-marks/check-status
 */
async function checkExamStatus(req, res) {
  try {
    const user = req.user;
    const { academic_year, exam_type, class_id, section, subject_id, school_id } = req.query;

    if (!academic_year || !exam_type || !class_id || !section || !subject_id) {
      return res.status(400).json({ detail: 'Missing required filters' });
    }

    const centralDb = getCentralDb();
    
    // Determine which school to use
    let targetSchoolId = user.school_id;
    
    // If super admin is providing school_id, use that
    if (user.role === 'super_admin' && school_id) {
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ id: targetSchoolId }, { projection: { _id: 0, db_name: 1 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Check if exam exists and get its status
    const exam = await schoolDb
      .collection('exams')
      .findOne({
        id: exam_type,
        class_id: class_id,
        subject_id: subject_id
      }, {
        projection: { _id: 0, status: 1, name: 1, exam_date: 1, academic_year: 1 }
      });

    if (!exam) {
      return res.json({
        status: 'not_scheduled',
        message: 'No exam scheduled for the selected criteria'
      });
    }

    // Also check if the academic year matches
    if (exam.academic_year && exam.academic_year !== academic_year) {
      return res.json({
        status: 'not_scheduled',
        message: 'No exam scheduled for the selected academic year'
      });
    }

    return res.json({
      status: exam.status || 'scheduled',
      exam_name: exam.name,
      exam_date: exam.exam_date,
      message: exam.status === 'completed' 
        ? 'Exam completed - Marks entry available'
        : exam.status === 'scheduled'
        ? 'Exam scheduled - Awaiting completion'
        : 'Exam status: ' + (exam.status || 'unknown')
    });
  } catch (err) {
    console.error('checkExamStatus error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
module.exports = {
  getFilters,
  getStudentsForMarks,
  getMarkDistribution,
  saveMarks,
  saveBulkMarks,
  getExistingMarks,
  checkExamStatus
};