// src/controllers/pendingFeesController.js
const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');
const QRCode = require('qrcode');

/**
 * Get pending fees grouped by class
 * GET /api/pending-fees/by-class
 */
async function getPendingFeesByClass(req, res) {
  try {
    const user = req.user;
    const { school_id, academic_year, fee_month } = req.query;

    const centralDb = getCentralDb();
    let targetSchoolId = user.school_id;

    if (user.role === 'super_admin' && school_id) {
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ $or: [{ id: targetSchoolId }, { code: targetSchoolId }] }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Build filter
    const filter = { paid: false };
    if (academic_year) filter.academic_year = academic_year;
    if (fee_month) filter.fee_month = fee_month;

    // Get all pending fees
    const pendingFees = await schoolDb
      .collection('fees')
      .find(filter, { projection: { _id: 0 } })
      .toArray();

    // Get all classes
    const classes = await schoolDb
      .collection('classes')
      .find({}, { projection: { _id: 0, id: 1, name: 1 } })
      .toArray();

    // Get all students for class mapping
    const students = await schoolDb
      .collection('students')
      .find({}, { projection: { _id: 0, id: 1, name: 1, class_id: 1, mobile_number: 1, father_name: 1, mother_name: 1 } })
      .toArray();

    const studentMap = {};
    students.forEach(student => {
      studentMap[student.id] = student;
    });

    // Group by class
    const classWiseData = {};
    
    classes.forEach(cls => {
      classWiseData[cls.id] = {
        class_id: cls.id,
        class_name: cls.name,
        students: [],
        total_pending: 0,
        student_count: 0
      };
    });

    pendingFees.forEach(fee => {
      const student = studentMap[fee.student_id];
      if (student && student.class_id) {
        const classData = classWiseData[student.class_id];
        if (classData) {
          // Check if student already exists in this class
          let studentData = classData.students.find(s => s.student_id === fee.student_id);
          
          if (!studentData) {
            studentData = {
              student_id: fee.student_id,
              student_name: student.name || fee.student_name,
              mobile_number: student.mobile_number || '',
              father_name: student.father_name || '',
              mother_name: student.mother_name || '',
              fees: [],
              total_pending: 0
            };
            classData.students.push(studentData);
            classData.student_count++;
          }

          studentData.fees.push({
            fee_id: fee.id,
            amount: Math.abs(fee.amount),
            fee_type: fee.fee_type,
            fee_month: fee.fee_month,
            due_date: fee.due_date,
            academic_year: fee.academic_year
          });

          studentData.total_pending += Math.abs(fee.amount);
          classData.total_pending += Math.abs(fee.amount);
        }
      }
    });

    // Convert to array and filter out empty classes
    const result = Object.values(classWiseData)
      .filter(cls => cls.student_count > 0)
      .sort((a, b) => a.class_name.localeCompare(b.class_name));

    return res.json({ data: result });
  } catch (err) {
    console.error('getPendingFeesByClass error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
async function getAllPendingFees(req, res) {
    try {
      const user = req.user;
      const { school_id, academic_year, fee_month, class_id } = req.query;
  
      const centralDb = getCentralDb();
      let targetSchoolId = user.school_id;
  
      if (user.role === 'super_admin' && school_id) {
        targetSchoolId = school_id;
      }
  
      const school = await centralDb
        .collection('schools')
        .findOne({ $or: [{ id: targetSchoolId }, { code: targetSchoolId }] }, { projection: { _id: 0 } });
  
      if (!school) return res.status(404).json({ detail: 'School not found' });
  
      const schoolDb = getSchoolDbByName(school.db_name);
  
      // Build filter
      const filter = { paid: false };
      if (academic_year) filter.academic_year = academic_year;
      if (fee_month) filter.fee_month = fee_month;
  
      // Get all pending fees
      const pendingFees = await schoolDb
        .collection('fees')
        .find(filter, { projection: { _id: 0 } })
        .toArray();
  
      // Get all students
      const studentFilter = {};
      if (class_id) {
        studentFilter.class_id = class_id;
      }
  
      const students = await schoolDb
        .collection('students')
        .find(studentFilter, { projection: { _id: 0, id: 1, name: 1, class_id: 1, mobile_number: 1, father_name: 1, mother_name: 1 } })
        .toArray();
  
      const studentMap = {};
      students.forEach(student => {
        studentMap[student.id] = student;
      });
  
      // Get classes data
      const classIds = [...new Set(students.map(s => s.class_id).filter(Boolean))];
      const classes = await schoolDb
        .collection('classes')
        .find({ id: { $in: classIds } }, { projection: { _id: 0, id: 1, name: 1 } })
        .toArray();
  
      const classMap = {};
      classes.forEach(cls => {
        classMap[cls.id] = cls.name;
      });
  
      // Group by student
      const studentWiseData = {};
  
      pendingFees.forEach(fee => {
        const student = studentMap[fee.student_id];
        if (!student) return;
  
        if (!studentWiseData[fee.student_id]) {
          studentWiseData[fee.student_id] = {
            student_id: fee.student_id,
            student_name: student.name || fee.student_name,
            class_name: classMap[student.class_id] || 'Unknown',
            mobile_number: student.mobile_number || '',
            father_name: student.father_name || '',
            mother_name: student.mother_name || '',
            fees: [],
            total_pending: 0
          };
        }
  
        studentWiseData[fee.student_id].fees.push({
          fee_id: fee.id,
          amount: Math.abs(fee.amount),
          fee_type: fee.fee_type,
          fee_month: fee.fee_month,
          due_date: fee.due_date,
          academic_year: fee.academic_year
        });
  
        studentWiseData[fee.student_id].total_pending += Math.abs(fee.amount);
      });
  
      // Convert to array and sort by student name
      const result = Object.values(studentWiseData)
        .sort((a, b) => a.student_name.localeCompare(b.student_name));
  
      return res.json({ data: result });
    } catch (err) {
      console.error('getAllPendingFees error', err);
      return res.status(500).json({ detail: 'Internal server error' });
    }
  }
  
  /**
   * Get classes for filter dropdown
   * GET /api/pending-fees/classes
   */
  async function getClasses(req, res) {
    try {
      const user = req.user;
      const { school_id } = req.query;
  
      const centralDb = getCentralDb();
      let targetSchoolId = user.school_id;
  
      if (user.role === 'super_admin' && school_id) {
        targetSchoolId = school_id;
      }
  
      const school = await centralDb
        .collection('schools')
        .findOne({ $or: [{ id: targetSchoolId }, { code: targetSchoolId }] }, { projection: { _id: 0 } });
  
      if (!school) return res.status(404).json({ detail: 'School not found' });
  
      const schoolDb = getSchoolDbByName(school.db_name);
  
      const classes = await schoolDb
        .collection('classes')
        .find({}, { projection: { _id: 0, id: 1, name: 1 } })
        .sort({ name: 1 })
        .toArray();
  
      return res.json(classes);
    } catch (err) {
      console.error('getClasses error', err);
      return res.status(500).json({ detail: 'Internal server error' });
    }
  }
/**
 * Get pending fees grouped by month
 * GET /api/pending-fees/by-month
 */
async function getPendingFeesByMonth(req, res) {
  try {
    const user = req.user;
    const { school_id, academic_year, class_id } = req.query;

    const centralDb = getCentralDb();
    let targetSchoolId = user.school_id;

    if (user.role === 'super_admin' && school_id) {
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ $or: [{ id: targetSchoolId }, { code: targetSchoolId }] }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Build filter
    const filter = { paid: false };
    if (academic_year) filter.academic_year = academic_year;
    if (class_id) {
      // Get students in this class
      const students = await schoolDb
        .collection('students')
        .find({ class_id }, { projection: { _id: 0, id: 1 } })
        .toArray();
      const studentIds = students.map(s => s.id);
      filter.student_id = { $in: studentIds };
    }

    // Get all pending fees
    const pendingFees = await schoolDb
      .collection('fees')
      .find(filter, { projection: { _id: 0 } })
      .toArray();

    // Get students data
    const studentIds = [...new Set(pendingFees.map(f => f.student_id))];
    const students = await schoolDb
      .collection('students')
      .find({ id: { $in: studentIds } }, { projection: { _id: 0, id: 1, name: 1, class_id: 1, mobile_number: 1, father_name: 1, mother_name: 1 } })
      .toArray();

    const studentMap = {};
    students.forEach(student => {
      studentMap[student.id] = student;
    });

    // Get classes data
    const classIds = [...new Set(students.map(s => s.class_id).filter(Boolean))];
    const classes = await schoolDb
      .collection('classes')
      .find({ id: { $in: classIds } }, { projection: { _id: 0, id: 1, name: 1 } })
      .toArray();

    const classMap = {};
    classes.forEach(cls => {
      classMap[cls.id] = cls.name;
    });

    // Group by month
    const monthWiseData = {};

    pendingFees.forEach(fee => {
      const student = studentMap[fee.student_id];
      if (!student) return;

      const monthKey = fee.fee_month 
        ? new Date(fee.fee_month).toLocaleString('default', { month: 'long', year: 'numeric' })
        : 'No Month Assigned';

      if (!monthWiseData[monthKey]) {
        monthWiseData[monthKey] = {
          month: monthKey,
          month_key: fee.fee_month || '',
          students: [],
          total_pending: 0,
          student_count: 0
        };
      }

      // Check if student already exists in this month
      let studentData = monthWiseData[monthKey].students.find(s => s.student_id === fee.student_id);

      if (!studentData) {
        studentData = {
          student_id: fee.student_id,
          student_name: student.name || fee.student_name,
          class_name: classMap[student.class_id] || 'Unknown',
          mobile_number: student.mobile_number || '',
          father_name: student.father_name || '',
          mother_name: student.mother_name || '',
          fees: [],
          total_pending: 0
        };
        monthWiseData[monthKey].students.push(studentData);
        monthWiseData[monthKey].student_count++;
      }

      studentData.fees.push({
        fee_id: fee.id,
        amount: Math.abs(fee.amount),
        fee_type: fee.fee_type,
        fee_month: fee.fee_month,
        due_date: fee.due_date,
        academic_year: fee.academic_year
      });

      studentData.total_pending += Math.abs(fee.amount);
      monthWiseData[monthKey].total_pending += Math.abs(fee.amount);
    });

    // Convert to array and sort
    const result = Object.values(monthWiseData)
      .sort((a, b) => {
        if (!a.month_key || !b.month_key) return 0;
        return new Date(a.month_key) - new Date(b.month_key);
      });

    return res.json({ data: result });
  } catch (err) {
    console.error('getPendingFeesByMonth error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Send WhatsApp reminder for pending fees
 * POST /api/pending-fees/send-reminder
 */
async function sendWhatsAppReminder(req, res) {
  try {
    const user = req.user;
    const { student_ids, fee_ids, message, school_id } = req.body;

    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ detail: 'Student IDs are required' });
    }

    const centralDb = getCentralDb();
    let targetSchoolId = user.school_id;

    if (user.role === 'super_admin' && school_id) {
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ $or: [{ id: targetSchoolId }, { code: targetSchoolId }] }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Get students with their pending fees
    const students = await schoolDb
      .collection('students')
      .find({ id: { $in: student_ids } }, { projection: { _id: 0, id: 1, name: 1, mobile_number: 1, father_name: 1, mother_name: 1 } })
      .toArray();

    // Get pending fees
    const feeFilter = { student_id: { $in: student_ids }, paid: false };
    if (fee_ids && fee_ids.length > 0) {
      feeFilter.id = { $in: fee_ids };
    }

    const pendingFees = await schoolDb
      .collection('fees')
      .find(feeFilter, { projection: { _id: 0 } })
      .toArray();

    // Group fees by student
    const feesByStudent = {};
    pendingFees.forEach(fee => {
      if (!feesByStudent[fee.student_id]) {
        feesByStudent[fee.student_id] = [];
      }
      feesByStudent[fee.student_id].push(fee);
    });

    // Get school UPI ID (you may need to add this to school collection)
    const schoolUpiId = school.upi_id || school.upi_number || 'SCHOOL@UPI';
    const schoolName = school.name || 'School';

    // Prepare messages and send
    const results = [];
    const errors = [];

    for (const student of students) {
      if (!student.mobile_number) {
        errors.push({
          student_id: student.id,
          student_name: student.name,
          error: 'No mobile number found'
        });
        continue;
      }

      const studentFees = feesByStudent[student.id] || [];
      if (studentFees.length === 0) {
        errors.push({
          student_id: student.id,
          student_name: student.name,
          error: 'No pending fees found'
        });
        continue;
      }

      const totalPending = studentFees.reduce((sum, fee) => sum + Math.abs(fee.amount), 0);
      
      // Generate UPI payment link
      const upiLink = `upi://pay?pa=${schoolUpiId}&pn=${encodeURIComponent(schoolName)}&am=${totalPending}&cu=INR&tn=${encodeURIComponent(`Fee Payment for ${student.name}`)}`;

      // Prepare message
      const defaultMessage = message || `Dear Parent,

Fee Reminder for ${student.name}

Total Pending Amount: ₹${totalPending.toLocaleString()}

Please pay using UPI ID: ${schoolUpiId}
Or scan the QR code in the fee portal.

Thank you,
${schoolName}`;

      const whatsappMessage = `${defaultMessage}\n\nUPI Payment Link: ${upiLink}`;

      try {
        // Send WhatsApp message using Twilio or similar service
        // 
        // To integrate with Twilio WhatsApp API:
        // 1. Install: npm install twilio
        // 2. Get Twilio credentials from https://www.twilio.com/console
        // 3. Uncomment and configure:
        /*
        const twilio = require('twilio');
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        
        await client.messages.create({
          from: 'whatsapp:+14155238886', // Your Twilio WhatsApp number
          to: `whatsapp:+91${student.mobile_number.replace(/\D/g, '')}`, // Format: +91XXXXXXXXXX
          body: whatsappMessage
        });
        */
        
        // Alternative: Use WhatsApp Business API or other services like:
        // - MessageBird
        // - Vonage (formerly Nexmo)
        // - WhatsApp Business Cloud API
        
        // For now, we'll just log and return success
        console.log(`Sending WhatsApp to ${student.mobile_number}:`, whatsappMessage);

        results.push({
          student_id: student.id,
          student_name: student.name,
          mobile_number: student.mobile_number,
          status: 'sent',
          total_pending: totalPending,
          fees_count: studentFees.length
        });

        // Record reminder in database
        await schoolDb.collection('fee_reminders').insertOne({
          id: uuidv4(),
          student_id: student.id,
          student_name: student.name,
          mobile_number: student.mobile_number,
          fee_ids: studentFees.map(f => f.id),
          total_amount: totalPending,
          message: whatsappMessage,
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_by: user.id,
          school_id: school.id
        });

      } catch (sendError) {
        console.error(`Error sending WhatsApp to ${student.mobile_number}:`, sendError);
        errors.push({
          student_id: student.id,
          student_name: student.name,
          mobile_number: student.mobile_number,
          error: sendError.message
        });
      }
    }

    return res.json({
      message: 'Reminders sent',
      success_count: results.length,
      error_count: errors.length,
      results,
      errors
    });
  } catch (err) {
    console.error('sendWhatsAppReminder error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Generate UPI QR code for payment
 * GET /api/pending-fees/qr-code
 */
async function generateUPIQRCode(req, res) {
  try {
    const user = req.user;
    const { student_id, fee_ids, school_id, amount } = req.query;

    const centralDb = getCentralDb();
    let targetSchoolId = user.school_id;

    if (user.role === 'super_admin' && school_id) {
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ $or: [{ id: targetSchoolId }, { code: targetSchoolId }] }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Get student info
    let studentName = 'Student';
    let totalAmount = parseFloat(amount) || 0;

    if (student_id) {
      const student = await schoolDb
        .collection('students')
        .findOne({ id: student_id }, { projection: { _id: 0, name: 1 } });
      
      if (student) {
        studentName = student.name;
      }

      // Calculate total from fees if not provided
      if (!totalAmount && fee_ids) {
        const feeIdsArray = Array.isArray(fee_ids) ? fee_ids : fee_ids.split(',');
        const fees = await schoolDb
          .collection('fees')
          .find({ id: { $in: feeIdsArray }, student_id, paid: false }, { projection: { _id: 0, amount: 1 } })
          .toArray();
        
        totalAmount = fees.reduce((sum, fee) => sum + Math.abs(fee.amount), 0);
      }
    }

    const schoolUpiId = school.upi_id || school.upi_number || 'SCHOOL@UPI';
    const schoolName = school.name || 'School';

    // Generate UPI payment link
    const upiLink = `upi://pay?pa=${schoolUpiId}&pn=${encodeURIComponent(schoolName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`Fee Payment for ${studentName}`)}`;

    // Generate QR code
    try {
      const qrCodeDataURL = await QRCode.toDataURL(upiLink, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 300
      });

      return res.json({
        upi_id: schoolUpiId,
        upi_link: upiLink,
        qr_code: qrCodeDataURL,
        amount: totalAmount,
        student_name: studentName,
        school_name: schoolName
      });
    } catch (qrError) {
      console.error('QR code generation error:', qrError);
      return res.status(500).json({ detail: 'Failed to generate QR code' });
    }
  } catch (err) {
    console.error('generateUPIQRCode error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get school UPI information
 * GET /api/pending-fees/upi-info
 */
async function getUPIInfo(req, res) {
  try {
    const user = req.user;
    const { school_id } = req.query;

    const centralDb = getCentralDb();
    let targetSchoolId = user.school_id;

    if (user.role === 'super_admin' && school_id) {
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ $or: [{ id: targetSchoolId }, { code: targetSchoolId }] }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    return res.json({
      upi_id: school.upi_id || school.upi_number || '',
      school_name: school.name || '',
      school_address: school.address || ''
    });
  } catch (err) {
    console.error('getUPIInfo error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = {
  getPendingFeesByClass,
  getPendingFeesByMonth,
  getAllPendingFees, // Add this
  getClasses, // Add this
  sendWhatsAppReminder,
  generateUPIQRCode,
  getUPIInfo
};

