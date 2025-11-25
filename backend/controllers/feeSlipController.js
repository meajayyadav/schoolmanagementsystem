const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');
const PDFDocument = require('pdfkit');
const path = require('path');

/**
 * Get all paid fee slips with advanced filtering
 */
async function getFeeSlips(req, res) {
  try {
    const user = req.user;
    const {
      school_id,
      class_id,
      student_id,
      fee_month,
      academic_year,
      payment_method,
      page = 1,
      limit = 10,
      search,
      start_date,
      end_date
    } = req.query;

    // console.log('Fee slips query:', {
    //   school_id, class_id, student_id, fee_month, academic_year, 
    //   payment_method, page, limit, search, start_date, end_date
    // });

    const centralDb = getCentralDb();
    let schools = [];

    // Determine which schools to query
    if (user.role === 'super_admin') {
      if (school_id && school_id !== '') {
        // Specific school requested
        const school = await centralDb
          .collection('schools')
          .findOne({ id: school_id }, { projection: { _id: 0 } });
        if (school) schools = [school];
      } else {
        // All schools
        schools = await centralDb
          .collection('schools')
          .find({}, { projection: { _id: 0 } })
          .toArray();
      }
    } else {
      // School admin or other roles - only their school
      const school = await centralDb
        .collection('schools')
        .findOne({ id: user.school_id }, { projection: { _id: 0 } });
      if (school) schools = [school];
    }

    // console.log('Schools to query:', schools.length);

    if (schools.length === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        page: parseInt(page),
        totalPages: 0,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      });
    }

    // Collect paid fee slips from all applicable schools
    const allFeeSlips = [];

    for (const school of schools) {
      const schoolDb = getSchoolDbByName(school.db_name);
      
      // Build filter - only paid fees
      const filter = { paid: true };

      // Apply filters only if they have values
      if (student_id && student_id !== '') filter.student_id = student_id;
      if (fee_month && fee_month !== '') filter.fee_month = fee_month;
      if (academic_year && academic_year !== '') filter.academic_year = academic_year;
      if (payment_method && payment_method !== '') filter.payment_method = payment_method;

      // Date range filter
      if (start_date || end_date) {
        filter.payment_date = {};
        if (start_date) filter.payment_date.$gte = start_date;
        if (end_date) filter.payment_date.$lte = end_date;
      }

      // Search filter
      if (search && search !== '') {
        const students = await schoolDb
          .collection('students')
          .find({
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { admission_number: { $regex: search, $options: 'i' } },
              { roll_number: { $regex: search, $options: 'i' } }
            ]
          }, { projection: { _id: 0, id: 1 } })
          .toArray();
        
        if (students.length > 0) {
          filter.student_id = { $in: students.map(s => s.id) };
        } else {
          // If no students match search, skip this school
          continue;
        }
      }

      // Class filter - FIXED: Handle both string and $in cases
      if (class_id && class_id !== '') {
        const students = await schoolDb
          .collection('students')
          .find({ class_id }, { projection: { _id: 0, id: 1 } })
          .toArray();
        
        if (students.length > 0) {
          const studentIds = students.map(s => s.id);
          
          if (filter.student_id) {
            // Handle different cases for student_id filter
            if (typeof filter.student_id === 'string') {
              // If student_id is a string, check if it exists in the class
              if (studentIds.includes(filter.student_id)) {
                // Keep the specific student filter
                filter.student_id = filter.student_id;
              } else {
                // Student not in this class, skip
                continue;
              }
            } else if (filter.student_id.$in && Array.isArray(filter.student_id.$in)) {
              // If student_id is an $in array, filter to only include students in this class
              const filteredStudentIds = filter.student_id.$in.filter(id => 
                studentIds.includes(id)
              );
              if (filteredStudentIds.length === 0) {
                // No students match both filters, skip
                continue;
              }
              filter.student_id.$in = filteredStudentIds;
            } else {
              // If student_id is some other object, use class students
              filter.student_id = { $in: studentIds };
            }
          } else {
            // No existing student filter, use class students
            filter.student_id = { $in: studentIds };
          }
        } else {
          // No students in this class, skip
          continue;
        }
      }

      // console.log(`Querying school ${school.name} with filter:`, JSON.stringify(filter, null, 2));

      const fees = await schoolDb
        .collection('fees')
        .find(filter, { projection: { _id: 0 } })
        .sort({ payment_date: -1 })
        .toArray();

      // console.log(`Found ${fees.length} fees in school ${school.name}`);

      // Enrich fee data with student and school information
      for (const fee of fees) {
        try {
          const student = await schoolDb
            .collection('students')
            .findOne({ id: fee.student_id }, { 
              projection: { 
                _id: 0, 
                id: 1, 
                name: 1, 
                admission_number: 1, 
                roll_number: 1, 
                class_id: 1,
                father_name: 1,
                mother_name: 1
              } 
            });

          let classInfo = null;
          if (student && student.class_id) {
            classInfo = await schoolDb
              .collection('classes')
              .findOne({ id: student.class_id }, { 
                projection: { _id: 0, id: 1, name: 1, section: 1 } 
              });
          }

          allFeeSlips.push({
            ...fee,
            student_id: student ? {
              id: student.id,
              name: student.name,
              admission_number: student.admission_number,
              roll_number: student.roll_number,
              father_name: student.father_name,
              mother_name: student.mother_name,
              class_id: classInfo
            } : null,
            school_id: {
              id: school.id,
              name: school.name,
              code: school.code,
              address: school.address,
              logo: school.logo,
              phone: school.phone,
              email: school.email
            }
          });
        } catch (error) {
          // console.error(`Error enriching fee ${fee.id}:`, error);
          // Continue with next fee even if one fails
        }
      }
    }

    // Apply pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedSlips = allFeeSlips.slice(startIndex, endIndex);

    // console.log(`Returning ${paginatedSlips.length} of ${allFeeSlips.length} fee slips`);

    // FIXED: Return the proper structure that frontend expects
    return res.json({
      success: true,
      data: paginatedSlips, // Direct array, not nested
      total: allFeeSlips.length,
      page: pageNum,
      totalPages: Math.ceil(allFeeSlips.length / limitNum),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: allFeeSlips.length,
        pages: Math.ceil(allFeeSlips.length / limitNum)
      }
    });
  } catch (err) {
    // console.error('getFeeSlips error:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Server error while fetching fee slips',
      detail: err.message 
    });
  }
}

/**
 * Get fee slip statistics
 */
async function getFeeSlipStats(req, res) {
  try {
    const user = req.user;
    const { school_id, start_date, end_date } = req.query;

    // console.log('Fee slip stats query:', { school_id, start_date, end_date });

    const centralDb = getCentralDb();
    let schools = [];

    // Determine which schools to query
    if (user.role === 'super_admin') {
      if (school_id && school_id !== '') {
        const school = await centralDb
          .collection('schools')
          .findOne({ id: school_id }, { projection: { _id: 0 } });
        if (school) schools = [school];
      } else {
        schools = await centralDb
          .collection('schools')
          .find({}, { projection: { _id: 0 } })
          .toArray();
      }
    } else {
      const school = await centralDb
        .collection('schools')
        .findOne({ id: user.school_id }, { projection: { _id: 0 } });
      if (school) schools = [school];
    }

    // console.log('Stats schools:', schools.length);

    if (schools.length === 0) {
      return res.json({
        success: true,
        data: {
          overview: { totalAmount: 0, totalSlips: 0, averageAmount: 0 },
          paymentMethods: [],
          monthlyTrend: []
        }
      });
    }

    let totalAmount = 0;
    let totalSlips = 0;
    const paymentMethods = {};
    const monthlyTrend = {};

    for (const school of schools) {
      const schoolDb = getSchoolDbByName(school.db_name);
      
      const filter = { paid: true };
      
      // Date range filter
      if (start_date || end_date) {
        filter.payment_date = {};
        if (start_date) filter.payment_date.$gte = start_date;
        if (end_date) filter.payment_date.$lte = end_date;
      }

      const fees = await schoolDb
        .collection('fees')
        .find(filter, { projection: { _id: 0, amount: 1, payment_method: 1, payment_date: 1 } })
        .toArray();

      fees.forEach(fee => {
        totalAmount += fee.amount || 0;
        totalSlips++;

        // Payment method distribution
        const method = fee.payment_method || 'unknown';
        if (!paymentMethods[method]) {
          paymentMethods[method] = { count: 0, total: 0 };
        }
        paymentMethods[method].count++;
        paymentMethods[method].total += fee.amount || 0;

        // Monthly trend
        if (fee.payment_date) {
          const monthKey = new Date(fee.payment_date).toLocaleString('default', { 
            year: 'numeric', 
            month: 'short' 
          });
          if (!monthlyTrend[monthKey]) {
            monthlyTrend[monthKey] = { count: 0, total: 0 };
          }
          monthlyTrend[monthKey].count++;
          monthlyTrend[monthKey].total += fee.amount || 0;
        }
      });
    }

    const paymentMethodArray = Object.entries(paymentMethods).map(([method, data]) => ({
      _id: method,
      count: data.count,
      total: data.total
    }));

    const monthlyTrendArray = Object.entries(monthlyTrend)
      .map(([month, data]) => {
        const date = new Date(month);
        return {
          _id: { year: date.getFullYear(), month: date.getMonth() + 1 },
          count: data.count,
          total: data.total
        };
      })
      .sort((a, b) => new Date(b._id.year, b._id.month) - new Date(a._id.year, a._id.month))
      .slice(0, 12);

    // FIXED: Return stats in proper structure
    res.json({
      success: true,
      data: {
        overview: {
          totalAmount,
          totalSlips,
          averageAmount: totalSlips > 0 ? totalAmount / totalSlips : 0
        },
        paymentMethods: paymentMethodArray,
        monthlyTrend: monthlyTrendArray
      }
    });
  } catch (err) {
    // console.error('getFeeSlipStats error:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Server error while fetching statistics',
      detail: err.message 
    });
  }
}

/**
 * Get single fee slip by ID
 */
async function getFeeSlipById(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;

    // console.log('Getting fee slip by ID:', id);

    const centralDb = getCentralDb();
    let schools = [];

    // Determine which schools to query
    if (user.role === 'super_admin') {
      schools = await centralDb
        .collection('schools')
        .find({}, { projection: { _id: 0 } })
        .toArray();
    } else {
      const school = await centralDb
        .collection('schools')
        .findOne({ id: user.school_id }, { projection: { _id: 0 } });
      if (school) schools = [school];
    }

    // Search for fee slip across all accessible schools
    for (const school of schools) {
      const schoolDb = getSchoolDbByName(school.db_name);
      
      const fee = await schoolDb
        .collection('fees')
        .findOne({ id: id, paid: true }, { projection: { _id: 0 } });

      if (fee) {
        const student = await schoolDb
          .collection('students')
          .findOne({ id: fee.student_id }, { 
            projection: { 
              _id: 0, 
              id: 1, 
              name: 1, 
              admission_number: 1, 
              roll_number: 1, 
              class_id: 1,
              father_name: 1,
              mother_name: 1,
              date_of_birth: 1
            } 
          });

        let classInfo = null;
        if (student && student.class_id) {
          classInfo = await schoolDb
            .collection('classes')
            .findOne({ id: student.class_id }, { 
              projection: { _id: 0, id: 1, name: 1, section: 1, class_teacher: 1 } 
            });
        }

        const enrichedFee = {
          ...fee,
          student_id: student ? {
            ...student,
            class_id: classInfo
          } : null,
          school_id: {
            id: school.id,
            name: school.name,
            code: school.code,
            address: school.address,
            logo: school.logo,
            phone: school.phone,
            email: school.email,
            principal_name: school.principal_name
          }
        };

        // FIXED: Return proper structure
        return res.json({
          success: true,
          data: enrichedFee
        });
      }
    }

    return res.status(404).json({ 
      success: false,
      message: 'Fee slip not found' 
    });
  } catch (err) {
    // console.error('getFeeSlipById error:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Server error while fetching fee slip',
      detail: err.message 
    });
  }
}

/**
 * Download fee slip as PDF
 */
async function downloadFeeSlip(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;

    // console.log('Download fee slip:', id);

    const centralDb = getCentralDb();
    let schools = [];

    // Determine which schools to query
    if (user.role === 'super_admin') {
      schools = await centralDb
        .collection('schools')
        .find({}, { projection: { _id: 0 } })
        .toArray();
    } else {
      const school = await centralDb
        .collection('schools')
        .findOne({ id: user.school_id }, { projection: { _id: 0 } });
      if (school) schools = [school];
    }

    // Search for fee slip
    let feeSlip = null;
    let schoolDb = null;

    for (const school of schools) {
      const db = getSchoolDbByName(school.db_name);
      const fee = await db
        .collection('fees')
        .findOne({ id: id, paid: true }, { projection: { _id: 0 } });

      if (fee) {
        feeSlip = fee;
        schoolDb = db;
        break;
      }
    }

    if (!feeSlip) {
      return res.status(404).json({ 
        success: false,
        message: 'Fee slip not found' 
      });
    }

    // Get student and school details
    const student = await schoolDb
      .collection('students')
      .findOne({ id: feeSlip.student_id }, { 
        projection: { 
          _id: 0, 
          id: 1, 
          name: 1, 
          admission_number: 1, 
          roll_number: 1, 
          class_id: 1,
          father_name: 1,
          mother_name: 1,
          date_of_birth: 1
        } 
      });

    const classInfo = await schoolDb
      .collection('classes')
      .findOne({ id: student?.class_id }, { 
        projection: { _id: 0, id: 1, name: 1, section: 1, class_teacher: 1 } 
      });

    const schoolInfo = await centralDb
      .collection('schools')
      .findOne({ id: feeSlip.school_id }, { projection: { _id: 0 } });

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=fee-slip-${student.admission_number}-${feeSlip.fee_month}.pdf`);
    
    // Pipe PDF to response
    doc.pipe(res);

    // Generate PDF content
    generateFeeSlipPDF(doc, {
      ...feeSlip,
      student_id: student,
      class_id: classInfo,
      school_id: schoolInfo
    });

    // Finalize PDF
    doc.end();

  } catch (err) {
    // console.error('downloadFeeSlip error:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Server error while generating fee slip',
      detail: err.message 
    });
  }
}

/**
 * Generate PDF content for fee slip
 */
function generateFeeSlipPDF(doc, feeSlip) {
  const { student_id, school_id, class_id, fee_breakdown, amount, payment_date, fee_month, academic_year, payment_method } = feeSlip;

  // School Header
  doc
    .fillColor('#1e40af')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text(school_id.name.toUpperCase(), 50, 50, { align: 'center' })
    .fontSize(10)
    .font('Helvetica')
    .text(school_id.address || '', { align: 'center' })
    .text(`Phone: ${school_id.phone || 'N/A'} | Email: ${school_id.email || 'N/A'}`, { align: 'center' })
    .moveDown();

  // Title
  doc
    .fillColor('#000000')
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('FEE PAYMENT RECEIPT', { align: 'center', underline: true })
    .moveDown();

  // School and Receipt Info
  const leftColumn = 50;
  const rightColumn = 300;
  let yPosition = 150;

  doc
    .fontSize(10)
    .font('Helvetica')
    .text('Receipt No:', leftColumn, yPosition)
    .font('Helvetica-Bold')
    .text(feeSlip.receipt_number || `FEE-${feeSlip.id.slice(-6)}`, leftColumn + 80, yPosition)
    
    .font('Helvetica')
    .text('Payment Date:', rightColumn, yPosition)
    .font('Helvetica-Bold')
    .text(new Date(payment_date).toLocaleDateString(), rightColumn + 80, yPosition);

  yPosition += 20;

  doc
    .font('Helvetica')
    .text('Academic Year:', leftColumn, yPosition)
    .font('Helvetica-Bold')
    .text(academic_year, leftColumn + 80, yPosition)
    
    .font('Helvetica')
    .text('Fee Month:', rightColumn, yPosition)
    .font('Helvetica-Bold')
    .text(fee_month ? new Date(fee_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A', rightColumn + 80, yPosition);

  yPosition += 30;

  // Student Information
  doc
    .fillColor('#1e40af')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('STUDENT INFORMATION', leftColumn, yPosition)
    .moveDown();

  yPosition += 20;

  doc
    .fillColor('#000000')
    .fontSize(10)
    .font('Helvetica')
    .text('Student Name:', leftColumn, yPosition)
    .font('Helvetica-Bold')
    .text(student_id.name, leftColumn + 80, yPosition)
    
    .font('Helvetica')
    .text('Admission No:', rightColumn, yPosition)
    .font('Helvetica-Bold')
    .text(student_id.admission_number, rightColumn + 80, yPosition);

  yPosition += 15;

  doc
    .font('Helvetica')
    .text('Class:', leftColumn, yPosition)
    .font('Helvetica-Bold')
    .text(`${class_id.name} ${class_id.section || ''}`, leftColumn + 80, yPosition)
    
    .font('Helvetica')
    .text('Roll No:', rightColumn, yPosition)
    .font('Helvetica-Bold')
    .text(student_id.roll_number, rightColumn + 80, yPosition);

  yPosition += 15;

  doc
    .font('Helvetica')
    .text("Father's Name:", leftColumn, yPosition)
    .font('Helvetica-Bold')
    .text(student_id.father_name, leftColumn + 80, yPosition);

  yPosition += 30;

  // Fee Breakdown
  doc
    .fillColor('#1e40af')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('FEE BREAKDOWN', leftColumn, yPosition)
    .moveDown();

  yPosition += 20;

  // Table Headers
  doc
    .fillColor('#ffffff')
    .rect(leftColumn, yPosition, 500, 20)
    .fill()
    .fillColor('#1e40af')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Particulars', leftColumn + 10, yPosition + 7)
    .text('Amount (₹)', 400, yPosition + 7, { align: 'right' });

  yPosition += 20;

  // Fee Items
  doc.fillColor('#000000').font('Helvetica');
  
  if (fee_breakdown) {
    const items = [
      { label: 'Monthly Fee', amount: fee_breakdown.monthly_fee || 0 },
      { label: 'Admission Fee', amount: fee_breakdown.admission_fee || 0 },
      { label: 'Registration Fee', amount: fee_breakdown.registration_fee || 0 },
      { label: 'Transport Fee', amount: fee_breakdown.transport || 0 },
      { label: 'Books', amount: fee_breakdown.books || 0 },
      { label: 'Uniform', amount: fee_breakdown.uniform || 0 },
      { label: 'Fine', amount: fee_breakdown.fine || 0 },
      { label: 'Others', amount: fee_breakdown.others || 0 },
      { label: 'Previous Balance', amount: fee_breakdown.previous_balance || 0 },
    ];

    items.forEach(item => {
      if (item.amount > 0) {
        doc
          .text(item.label, leftColumn + 10, yPosition + 7)
          .text(item.amount.toFixed(2), 400, yPosition + 7, { align: 'right' });
        yPosition += 15;
      }
    });

    // Discount
    if (fee_breakdown.discount_percent > 0) {
      const discountAmount = fee_breakdown.discount_amount || (amount * fee_breakdown.discount_percent / 100);
      doc
        .text(`Discount (${fee_breakdown.discount_percent}%)`, leftColumn + 10, yPosition + 7)
        .text(`-${discountAmount.toFixed(2)}`, 400, yPosition + 7, { align: 'right' });
      yPosition += 15;
    }
  } else {
    // If no breakdown, show total amount
    doc
      .text('Total Fee', leftColumn + 10, yPosition + 7)
      .text(amount.toFixed(2), 400, yPosition + 7, { align: 'right' });
    yPosition += 15;
  }

  // Total
  yPosition += 5;
  doc
    .fillColor('#1e40af')
    .rect(leftColumn, yPosition, 500, 25)
    .fill()
    .fillColor('#ffffff')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('TOTAL AMOUNT', leftColumn + 10, yPosition + 9)
    .text(`₹${amount.toFixed(2)}`, 400, yPosition + 9, { align: 'right' });

  yPosition += 40;

  // Payment Information
  doc
    .fillColor('#1e40af')
    .fontSize(12)
    .text('PAYMENT INFORMATION', leftColumn, yPosition)
    .moveDown();

  yPosition += 20;

  doc
    .fillColor('#000000')
    .fontSize(10)
    .font('Helvetica')
    .text('Payment Method:', leftColumn, yPosition)
    .font('Helvetica-Bold')
    .text((payment_method || '').toUpperCase(), leftColumn + 90, yPosition)
    
    .font('Helvetica')
    .text('Amount Paid:', rightColumn, yPosition)
    .font('Helvetica-Bold')
    .text(`₹${amount.toFixed(2)}`, rightColumn + 80, yPosition);

  yPosition += 40;

  // Authorization
  doc
    .text('_________________________', leftColumn, yPosition)
    .text('School Stamp & Signature', leftColumn, yPosition + 15)
    
    .text('_________________________', 300, yPosition)
    .text('Parent/Guardian Signature', 300, yPosition + 15);

  // Footer
  doc
    .fontSize(8)
    .fillColor('#666666')
    .text('This is a computer generated receipt. No signature required.', 50, 750, { align: 'center' });
}

module.exports = {
  getFeeSlips,
  getFeeSlipById,
  downloadFeeSlip,
  getFeeSlipStats
};