// src/controllers/reportCardController.js
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * Get report card filters
 * GET /api/report-cards/filters
 */
async function getReportCardFilters(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();
    
    let targetSchoolId = user.school_id;
    if (user.role === 'super_admin' && req.query.school_id) {
      targetSchoolId = req.query.school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ id: targetSchoolId }, { projection: { _id: 0, db_name: 1, name: 1 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Get academic years from exam marks
    const academicYears = await schoolDb
      .collection('exam_marks')
      .distinct('academic_year');

    // Get unique exam types from exams collection (grouped by name)
    const allExams = await schoolDb
      .collection('exams')
      .find({}, { projection: { _id: 0, id: 1, name: 1 } })
      .toArray();

    // Group exams by name to remove duplicates
    const uniqueExamTypes = allExams.reduce((acc, exam) => {
      const existingExam = acc.find(e => e.name === exam.name);
      if (!existingExam) {
        acc.push({
          id: exam.id,
          name: exam.name
        });
      }
      return acc;
    }, []);

    // Get classes
    const classes = await schoolDb
      .collection('classes')
      .find({}, { projection: { _id: 0, id: 1, name: 1 } })
      .toArray();

    // Get sections from students
    const sections = await schoolDb
      .collection('students')
      .distinct('class_section');

    return res.json({
      school_name: school.name,
      academic_years: academicYears.filter(Boolean),
      exam_types: uniqueExamTypes,
      classes: classes,
      sections: sections.filter(Boolean)
    });
  } catch (err) {
    console.error('getReportCardFilters error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get student report cards - Only for students with exam marks
 * GET /api/report-cards/students
 */
async function getStudentReportCards(req, res) {
  try {
    const user = req.user;
    const { academic_year, exam_type, class_id, section, student_id, school_id } = req.query;

    if (!academic_year || !exam_type || !class_id) {
      return res.status(400).json({ detail: 'Academic year, exam type, and class are required' });
    }

    const centralDb = getCentralDb();
    
    let targetSchoolId = user.school_id;
    if (user.role === 'super_admin' && school_id) {
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ id: targetSchoolId }, { projection: { _id: 0, db_name: 1, name: 1, logo: 1 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Get exam info first to get all exams with this name
    const examInfo = await schoolDb
      .collection('exams')
      .findOne({ id: exam_type }, { projection: { _id: 0, name: 1 } });

    if (!examInfo) {
      return res.status(404).json({ detail: 'Exam not found' });
    }

    // Get all exams with the same name (for multiple subjects)
    const allExamsWithSameName = await schoolDb
      .collection('exams')
      .find({ 
        name: examInfo.name,
        class_id: class_id
      }, { 
        projection: { _id: 0, id: 1, subject_id: 1, total_marks: 1 } 
      })
      .toArray();

    const examIds = allExamsWithSameName.map(exam => exam.id);
    const examMap = Object.fromEntries(allExamsWithSameName.map(exam => [exam.subject_id, exam]));

    console.log(`Found ${examIds.length} exams with name: ${examInfo.name}`);

    // Get students who have exam marks for ANY of these exams
    const studentsWithMarks = await schoolDb
      .collection('exam_marks')
      .aggregate([
        {
          $match: {
            academic_year: academic_year,
            exam_type: { $in: examIds },
            class_id: class_id,
            ...(section && { section: section })
          }
        },
        {
          $group: {
            _id: "$student_id"
          }
        },
        {
          $lookup: {
            from: "students",
            localField: "_id",
            foreignField: "id",
            as: "student_info"
          }
        },
        {
          $unwind: "$student_info"
        },
        {
          $project: {
            _id: 0,
            id: "$student_info.id",
            name: "$student_info.name",
            roll_number: "$student_info.roll_number",
            class_section: "$student_info.class_section",
            father_name: "$student_info.father_name",
            date_of_birth: "$student_info.date_of_birth",
            picture: "$student_info.picture"
          }
        },
        {
          $sort: { roll_number: 1 }
        }
      ])
      .toArray();

    console.log(`Found ${studentsWithMarks.length} students with exam marks`);

    if (studentsWithMarks.length === 0) {
      return res.json({ 
        report_cards: [], 
        school_info: school,
        summary: {
          total_students: 0,
          students_passed: 0,
          students_failed: 0,
          pass_percentage: 0
        }
      });
    }

    const studentIds = studentsWithMarks.map(s => s.id);

    // Get ALL exam marks for these students across all subjects for this exam
    const allExamMarks = await schoolDb
      .collection('exam_marks')
      .find({
        academic_year: academic_year,
        exam_type: { $in: examIds },
        class_id: class_id,
        student_id: { $in: studentIds }
      }, {
        projection: {
          _id: 0,
          student_id: 1,
          subject_id: 1,
          exam_type: 1,
          theory_marks: 1,
          practical_marks: 1,
          project_marks: 1,
          oral_marks: 1,
          remarks: 1
        }
      })
      .toArray();

    // Get all subjects
    const subjects = await schoolDb
      .collection('subjects')
      .find({}, { projection: { _id: 0, id: 1, name: 1, code: 1 } })
      .toArray();

    const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));

    // Get class info
    const classInfo = await schoolDb
      .collection('classes')
      .findOne({ id: class_id }, { projection: { _id: 0, name: 1, grade: 1 } });

    // Process report cards for each student
    const reportCards = studentsWithMarks.map(student => {
      // Get all marks for this student across all subjects
      const studentAllMarks = allExamMarks.filter(mark => mark.student_id === student.id);
      
      // Group marks by subject and get the best marks if there are duplicates
      const subjectMarksMap = new Map();
      
      studentAllMarks.forEach(mark => {
        const existingMark = subjectMarksMap.get(mark.subject_id);
        const currentTotal = (parseFloat(mark.theory_marks) || 0) + 
                           (parseFloat(mark.practical_marks) || 0) + 
                           (parseFloat(mark.project_marks) || 0) + 
                           (parseFloat(mark.oral_marks) || 0);
        
        if (!existingMark || currentTotal > existingMark.total) {
          const examForSubject = examMap[mark.subject_id];
          const maxMarks = examForSubject?.total_marks || 100;
          const percentage = maxMarks > 0 ? (currentTotal / maxMarks * 100) : 0;
          
          subjectMarksMap.set(mark.subject_id, {
            mark,
            total: currentTotal,
            percentage,
            maxMarks,
            exam: examForSubject
          });
        }
      });

      const subjectResults = Array.from(subjectMarksMap.values()).map(({ mark, total, percentage, maxMarks, exam }) => {
        const subject = subjectMap[mark.subject_id];
        const theory = parseFloat(mark.theory_marks) || 0;
        const practical = parseFloat(mark.practical_marks) || 0;
        const project = parseFloat(mark.project_marks) || 0;
        const oral = parseFloat(mark.oral_marks) || 0;
        
        return {
          subject_id: mark.subject_id,
          subject_name: subject?.name || 'Unknown',
          subject_code: subject?.code || '',
          theory_marks: theory,
          practical_marks: practical,
          project_marks: project,
          oral_marks: oral,
          total_marks: total,
          max_marks: maxMarks,
          percentage: percentage.toFixed(2),
          grade: calculateGrade(percentage),
          remarks: mark.remarks || ''
        };
      });

      // Sort subjects by name for consistent display
      subjectResults.sort((a, b) => a.subject_name.localeCompare(b.subject_name));

      // Calculate overall result
      const overallTotal = subjectResults.reduce((sum, subject) => sum + subject.total_marks, 0);
      const totalMaxMarks = subjectResults.reduce((sum, subject) => sum + subject.max_marks, 0);
      const overallPercentage = totalMaxMarks > 0 ? (overallTotal / totalMaxMarks * 100) : 0;
      const subjectsPassed = subjectResults.filter(s => s.grade !== 'F').length;

      return {
        student_info: {
          id: student.id,
          name: student.name,
          roll_number: student.roll_number,
          section: student.class_section,
          father_name: student.father_name,
          date_of_birth: student.date_of_birth,
          picture: student.picture
        },
        academic_info: {
          academic_year: academic_year,
          exam_name: examInfo.name,
          class_name: classInfo?.name || 'Unknown Class',
          grade: classInfo?.grade || '',
          total_subjects: subjectResults.length
        },
        subject_results: subjectResults,
        overall_result: {
          total_marks: overallTotal,
          max_marks: totalMaxMarks,
          percentage: overallPercentage.toFixed(2),
          grade: calculateGrade(overallPercentage),
          total_subjects: subjectResults.length,
          subjects_passed: subjectsPassed,
          status: overallPercentage >= 33 && subjectsPassed === subjectResults.length ? 'PASS' : 'FAIL'
        }
      };
    });

    // Calculate summary statistics
    const studentsPassed = reportCards.filter(rc => rc.overall_result.status === 'PASS').length;
    const totalStudents = reportCards.length;
    const passPercentage = totalStudents > 0 ? ((studentsPassed / totalStudents) * 100).toFixed(1) : 0;

    return res.json({
      school_info: school,
      report_cards: reportCards,
      summary: {
        total_students: totalStudents,
        students_passed: studentsPassed,
        students_failed: totalStudents - studentsPassed,
        pass_percentage: passPercentage,
        total_subjects: reportCards[0]?.academic_info.total_subjects || 0,
        exam_name: examInfo.name
      }
    });
  } catch (err) {
    console.error('getStudentReportCards error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Calculate grade based on percentage
 */
function calculateGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  if (percentage >= 33) return 'E';
  return 'F';
}

/**
 * Generate PDF report card
 * POST /api/report-cards/generate-pdf
 */
async function generatePdfReportCard(req, res) {
  try {
    const user = req.user;
    const { academic_year, exam_type, class_id, section, student_id, format = 'individual' } = req.body;

    if (!academic_year || !exam_type || !class_id) {
      return res.status(400).json({ detail: 'Academic year, exam type, and class are required' });
    }

    // This would integrate with a PDF generation service like pdfkit, puppeteer, etc.
    // For now, return success with mock data
    return res.json({
      message: 'PDF generation initiated successfully',
      download_url: `/api/report-cards/download/${Date.now()}.pdf`,
      format: format,
      details: {
        academic_year,
        exam_type, 
        class_id,
        section,
        generated_at: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('generatePdfReportCard error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = {
  getReportCardFilters,
  getStudentReportCards,
  generatePdfReportCard
};
