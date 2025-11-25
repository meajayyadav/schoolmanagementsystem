// controllers/bulkUploadController.js
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * Download Excel template for bulk upload
 * GET /api/bulk-upload/students/template
 */
async function downloadTemplate(req, res) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students Template');

    // Add headers
    worksheet.columns = [
      { header: 'Name*', key: 'name', width: 25 },
      { header: 'Roll Number*', key: 'roll_number', width: 15 },
      { header: 'Grade Level*', key: 'grade_level', width: 15 },
      { header: 'Class Section*', key: 'class_section', width: 15 },
      { header: "Father's Name*", key: 'father_name', width: 25 },
      { header: 'Date of Birth (YYYY-MM-DD)', key: 'date_of_birth', width: 20 },
      { header: 'Enrollment Date (YYYY-MM-DD)', key: 'enrollment_date', width: 20 },
      { header: 'Contact Phone', key: 'contact_phone', width: 15 },
      { header: 'Contact Email', key: 'contact_email', width: 25 },
      { header: 'Address', key: 'address', width: 30 }
    ];

    // Style header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2E86AB' }
    };

    // Add sample data
    const sampleData = [
      {
        name: 'John Doe',
        roll_number: '2024001',
        grade_level: '10',
        class_section: 'A',
        father_name: 'Robert Doe',
        date_of_birth: '2008-05-15',
        enrollment_date: '2024-01-15',
        contact_phone: '+1234567890',
        contact_email: 'john.doe@example.com',
        address: '123 Main Street, City, State'
      }
    ];

    sampleData.forEach(data => {
      worksheet.addRow(data);
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=student_bulk_upload_template.xlsx');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Download template error:', error);
    res.status(500).json({ 
      detail: 'Failed to generate template'
    });
  }
}

/**
 * Bulk upload students from Excel/CSV file
 * POST /api/bulk-upload/students
 */
async function bulkUploadStudents(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();

    // Validate file exists
    if (!req.file) {
      return res.status(400).json({ detail: 'No file uploaded' });
    }

    // Determine school
    let schoolIdOrCode = user.school_id;
    if (user.role === 'super_admin') {
      schoolIdOrCode = req.body.school_id;
      if (!schoolIdOrCode) {
        return res.status(400).json({ detail: 'school_id is required for super admin' });
      }
    }

    // Get school details
    const school = await centralDb.collection('schools').findOne(
      { $or: [{ id: schoolIdOrCode }, { code: schoolIdOrCode }] },
      { projection: { _id: 0 } }
    );
    
    if (!school) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ detail: 'School not found' });
    }

    const schoolDb = getSchoolDbByName(school.db_name);
    const results = {
      successCount: 0,
      errorCount: 0,
      errors: []
    };

    // Process the file
    await processUploadedFile(req.file, schoolDb, school.id, results);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Return results
    if (results.errorCount > 0 && results.successCount === 0) {
      return res.status(400).json(results);
    }

    res.json(results);

  } catch (error) {
    console.error('Bulk upload error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      detail: 'Failed to process upload',
      successCount: 0,
      errorCount: 1,
      errors: [{ row: 0, message: 'System error', details: error.message }]
    });
  }
}

/**
 * Process uploaded Excel/CSV file
 */
async function processUploadedFile(file, schoolDb, schoolId, results) {
  const workbook = new ExcelJS.Workbook();
  const fileExtension = path.extname(file.originalname).toLowerCase();

  // Read file based on extension
  if (fileExtension === '.csv') {
    await workbook.csv.readFile(file.path);
  } else {
    await workbook.xlsx.readFile(file.path);
  }

  const worksheet = workbook.worksheets[0];
  
  // Process rows starting from row 2 (skip header)
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    
    // Skip empty rows
    if (row.cellCount === 0 || !row.getCell(1).value) {
      continue;
    }

    try {
      const rowData = extractRowData(row);
      
      // Validate required fields
      const validationErrors = validateStudentData(rowData, rowNumber);
      if (validationErrors.length > 0) {
        results.errors.push(...validationErrors);
        results.errorCount++;
        continue;
      }

      // Check for duplicate roll number
      const existingStudent = await schoolDb.collection('students').findOne({
        roll_number: rowData.roll_number
      });

      if (existingStudent) {
        results.errors.push({
          row: rowNumber,
          message: `Duplicate roll number: ${rowData.roll_number}`,
          details: 'Roll number must be unique within the school'
        });
        results.errorCount++;
        continue;
      }

      // Create student record
      const studentPayload = {
        id: uuidv4(),
        name: rowData.name,
        roll_number: rowData.roll_number,
        grade_level: rowData.grade_level,
        class_section: rowData.class_section,
        father_name: rowData.father_name,
        date_of_birth: rowData.date_of_birth ? new Date(rowData.date_of_birth).toISOString() : null,
        enrollment_date: rowData.enrollment_date ? new Date(rowData.enrollment_date).toISOString() : new Date().toISOString(),
        contact_phone: rowData.contact_phone || '',
        contact_email: rowData.contact_email || '',
        address: rowData.address || '',
        school_id: schoolId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await schoolDb.collection('students').insertOne(studentPayload);
      results.successCount++;

    } catch (error) {
      console.error(`Error processing row ${rowNumber}:`, error);
      results.errors.push({
        row: rowNumber,
        message: 'Processing error',
        details: error.message
      });
      results.errorCount++;
    }
  }
}

/**
 * Extract data from worksheet row
 */
function extractRowData(row) {
  return {
    name: row.getCell(1).value?.toString().trim() || '',
    roll_number: row.getCell(2).value?.toString().trim() || '',
    grade_level: row.getCell(3).value?.toString().trim() || '',
    class_section: row.getCell(4).value?.toString().trim() || '',
    father_name: row.getCell(5).value?.toString().trim() || '',
    date_of_birth: row.getCell(6).value?.toString().trim() || '',
    enrollment_date: row.getCell(7).value?.toString().trim() || '',
    contact_phone: row.getCell(8).value?.toString().trim() || '',
    contact_email: row.getCell(9).value?.toString().trim() || '',
    address: row.getCell(10).value?.toString().trim() || ''
  };
}

/**
 * Validate student data
 */
function validateStudentData(rowData, rowNumber) {
  const errors = [];
  const requiredFields = ['name', 'roll_number', 'grade_level', 'class_section', 'father_name'];

  requiredFields.forEach(field => {
    if (!rowData[field] || rowData[field].trim() === '') {
      errors.push({
        row: rowNumber,
        message: `${field.replace('_', ' ').toUpperCase()} is required`,
        details: `Please provide a value for ${field}`
      });
    }
  });

  // Date validation
  if (rowData.date_of_birth && !isValidDate(rowData.date_of_birth)) {
    errors.push({
      row: rowNumber,
      message: 'Invalid date format for Date of Birth',
      details: 'Use YYYY-MM-DD format'
    });
  }

  if (rowData.enrollment_date && !isValidDate(rowData.enrollment_date)) {
    errors.push({
      row: rowNumber,
      message: 'Invalid date format for Enrollment Date',
      details: 'Use YYYY-MM-DD format'
    });
  }

  return errors;
}

/**
 * Validate date format
 */
function isValidDate(dateString) {
  if (!dateString) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

module.exports = {
  downloadTemplate,
  bulkUploadStudents
};