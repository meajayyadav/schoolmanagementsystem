const { getCentralDb, getSchoolDbByName } = require('../db');
const { v4: uuidv4 } = require('uuid');

async function getDashboardStats(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();
    const { school_id, period = 'monthly', academic_year } = req.query;

    // ✅ Determine target school
    let targetSchoolId = user.school_id;
    let targetSchool = null;

    if (user.role === 'super_admin') {
      if (school_id) {
        targetSchoolId = school_id;
      } else {
        // Super admin without specific school - return global overview
        return await getGlobalOverview(centralDb);
      }
    }

    // ✅ Get school details
    targetSchool = await centralDb.collection('schools').findOne({ id: targetSchoolId });
    if (!targetSchool) {
      return res.status(404).json({ detail: 'School not found' });
    }

    const schoolDb = getSchoolDbByName(targetSchool.db_name);

    // ✅ Get all statistics in parallel for better performance
    const [
      total_students,
      total_teachers,
      total_classes,
      feeStats,
      recentTransactions,
      classDistribution,
      monthlyTrends,
      classWiseFees, // ✅ Added classWiseFees to parallel calls
      salaryStats // ✅ Added salary statistics
    ] = await Promise.all([
      // Basic counts
      schoolDb.collection('students').countDocuments({}),
      schoolDb.collection('teachers').countDocuments({}),
      schoolDb.collection('classes').countDocuments({}),
      
      // Fee statistics
      getFeeStatistics(schoolDb, period, academic_year),
      
      // Recent transactions
      getRecentTransactions(schoolDb, academic_year),
      
      // Class distribution
      getClassDistribution(schoolDb),
      
      // Monthly trends
      getMonthlyTrends(schoolDb, academic_year),
      
      // ✅ Class-wise fees - added here
      getClassWiseFees(schoolDb, academic_year),
      
      // ✅ Salary statistics
      getSalaryStatistics(schoolDb, academic_year)
    ]);

    // ✅ Calculate collection rate
    const total_fee_collected = feeStats.total_collection || 0;
    const total_fee_pending = feeStats.pending_collection || 0;
    const total_fee_amount = total_fee_collected + total_fee_pending;
    const collection_rate = total_fee_amount > 0 
      ? Math.round((total_fee_collected / total_fee_amount) * 100) 
      : 0;

    // ✅ Calculate profit and losses
    const total_salary_paid = salaryStats.total_paid || 0;
    const total_salary_pending = salaryStats.total_pending || 0;
    const total_profit = total_fee_collected - total_salary_paid;
    const total_losses = total_fee_pending + total_salary_pending;

    // ✅ Prepare response
    const response = {
      // Basic stats
      total_students,
      total_teachers,
      total_classes,
      total_schools: user.role === 'super_admin' ? await centralDb.collection('schools').countDocuments({}) : undefined,
      
      // Fee analytics
      total_fee_collected,
      total_fee_pending,
      collection_rate,
      
      // Salary analytics
      total_salary_paid,
      total_salary_pending,
      total_profit,
      total_losses,
      
      // Detailed analytics
      fee_breakdown: feeStats.fee_type_breakdown || {},
      monthly_trends: monthlyTrends,
      
      // Class-wise data
      class_distribution: classDistribution,
      class_wise_fees: classWiseFees, // ✅ Use the classWiseFees from parallel call
      
      // Recent activity
      recent_transactions: recentTransactions,
      
      // Performance metrics
      performance_metrics: {
        student_teacher_ratio: total_teachers > 0 ? (total_students / total_teachers).toFixed(1) : 0,
        average_class_size: total_classes > 0 ? (total_students / total_classes).toFixed(1) : 0,
        fee_collection_efficiency: collection_rate
      }
    };

    return res.json(response);

  } catch (err) {
    console.error('Dashboard stats error:', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

// ✅ Global overview for super admin
async function getGlobalOverview(centralDb) {
  const total_schools = await centralDb.collection('schools').countDocuments({});
  
  // Get sample schools for overview
  const schools = await centralDb.collection('schools')
    .find({}, { projection: { _id: 0, id: 1, name: 1, db_name: 1 } })
    .limit(10)
    .toArray();

  // Get aggregated stats from all schools
  let total_students = 0;
  let total_teachers = 0;
  let total_fee_collected = 0;
  let total_fee_pending = 0;

  for (const school of schools) {
    try {
      const schoolDb = getSchoolDbByName(school.db_name);
      const schoolStats = await getSchoolOverview(schoolDb);
      
      total_students += schoolStats.total_students;
      total_teachers += schoolStats.total_teachers;
      total_fee_collected += schoolStats.total_fee_collected;
      total_fee_pending += schoolStats.total_fee_pending;
    } catch (error) {
      console.error(`Error fetching stats for school ${school.name}:`, error);
      // Continue with other schools
    }
  }

  const total_fee_amount = total_fee_collected + total_fee_pending;
  const collection_rate = total_fee_amount > 0 
    ? Math.round((total_fee_collected / total_fee_amount) * 100) 
    : 0;

  return {
    total_schools,
    total_students,
    total_teachers,
    total_fee_collected,
    total_fee_pending,
    collection_rate,
    school_sample: schools.map(school => ({
      id: school.id,
      name: school.name,
    }))
  };
}

// ✅ Fee statistics
async function getFeeStatistics(schoolDb, period, academic_year) {
  try {
    // Build filter for academic year
    const filter = {};
    if (academic_year) {
      filter.academic_year = academic_year;
    }
    
    const fees = await schoolDb.collection('fees')
      .find(filter, { projection: { _id: 0, amount: 1, paid: 1, fee_type: 1, created_at: 1, payment_date: 1, academic_year: 1 } })
      .toArray();

    let total_collection = 0;
    let pending_collection = 0;
    const fee_type_breakdown = {};
    const monthly_collection = {};

    fees.forEach(fee => {
      const amount = Math.abs(fee.amount);
      
      // Total and pending collection
      if (fee.paid) {
        total_collection += amount;
      } else {
        pending_collection += amount;
      }

      // Fee type breakdown
      const feeType = fee.fee_type || 'General';
      if (!fee_type_breakdown[feeType]) {
        fee_type_breakdown[feeType] = {
          total: 0,
          paid: 0,
          pending: 0
        };
      }
      
      fee_type_breakdown[feeType].total += amount;
      if (fee.paid) {
        fee_type_breakdown[feeType].paid += amount;
      } else {
        fee_type_breakdown[feeType].pending += amount;
      }

      // Monthly collection (for paid fees only)
      if (fee.paid && fee.payment_date) {
        const monthKey = new Date(fee.payment_date).toLocaleString('default', { 
          month: 'short', 
          year: 'numeric' 
        });
        
        if (!monthly_collection[monthKey]) {
          monthly_collection[monthKey] = 0;
        }
        monthly_collection[monthKey] += amount;
      }
    });

    return {
      total_collection,
      pending_collection,
      fee_type_breakdown,
      monthly_collection
    };
  } catch (error) {
    console.error('Error fetching fee statistics:', error);
    return {
      total_collection: 0,
      pending_collection: 0,
      fee_type_breakdown: {},
      monthly_collection: {}
    };
  }
}

// ✅ Recent transactions
async function getRecentTransactions(schoolDb, academic_year) {
  try {
    // Build match filter for academic year
    const matchFilter = {};
    if (academic_year) {
      matchFilter.academic_year = academic_year;
    }
    
    const transactions = await schoolDb.collection('fees')
      .aggregate([
        {
          $match: matchFilter
        },
        {
          $lookup: {
            from: 'students',
            localField: 'student_id',
            foreignField: 'id',
            as: 'student'
          }
        },
        {
          $unwind: {
            path: '$student',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'classes',
            localField: 'student.class_id',
            foreignField: 'id',
            as: 'class'
          }
        },
        {
          $unwind: {
            path: '$class',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 0,
            id: 1,
            student_name: '$student.name',
            student_id: '$student.id',
            class_name: '$class.name',
            amount: 1,
            fee_type: 1,
            fee_month: 1,
            paid: 1,
            payment_method: 1,
            payment_date: 1,
            created_at: 1
          }
        },
        {
          $sort: { created_at: -1 }
        },
        {
          $limit: 10
        }
      ])
      .toArray();

    return transactions.map(transaction => ({
      ...transaction,
      amount: Math.abs(transaction.amount),
      student_name: transaction.student_name || 'Unknown Student',
      class_name: transaction.class_name || 'Unknown Class'
    }));
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    return [];
  }
}

// ✅ Class distribution
async function getClassDistribution(schoolDb) {
  try {
    const classes = await schoolDb.collection('classes')
      .find({}, { projection: { _id: 0, id: 1, name: 1 } })
      .toArray();

    const students = await schoolDb.collection('students')
      .find({}, { projection: { _id: 0, class_id: 1 } })
      .toArray();

    const distribution = classes.map(cls => {
      const count = students.filter(student => student.class_id === cls.id).length;
      return {
        name: cls.name,
        count,
        class_id: cls.id
      };
    });

    return distribution;
  } catch (error) {
    console.error('Error fetching class distribution:', error);
    return [];
  }
}

// ✅ Monthly trends
async function getMonthlyTrends(schoolDb, academic_year) {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Build filter for academic year
    const filter = {
      payment_date: { $gte: sixMonthsAgo.toISOString() },
      paid: true
    };
    if (academic_year) {
      filter.academic_year = academic_year;
    }

    const fees = await schoolDb.collection('fees')
      .find(filter, {
        projection: {
          _id: 0,
          amount: 1,
          payment_date: 1,
          academic_year: 1
        }
      })
      .toArray();

    const monthlyData = {};
    
    fees.forEach(fee => {
      const date = new Date(fee.payment_date);
      const monthKey = date.toLocaleString('default', { 
        month: 'short', 
        year: 'numeric' 
      });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = 0;
      }
      monthlyData[monthKey] += Math.abs(fee.amount);
    });

    // Convert to array format for charts and ensure proper order
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    return Object.entries(monthlyData)
      .map(([month, collected]) => {
        const [monthName, year] = month.split(' ');
        return {
          month,
          collected,
          sortKey: parseInt(year) * 100 + months.indexOf(monthName)
        };
      })
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ month, collected }) => ({
        month,
        collected,
        pending: 0 // This would require additional query
      }));
  } catch (error) {
    console.error('Error fetching monthly trends:', error);
    return [];
  }
}

// ✅ FIXED: Class-wise fees function
async function getClassWiseFees(schoolDb, academic_year) {
  try {
    console.log('Fetching class-wise fees...');
    
    // Get all classes
    const classes = await schoolDb.collection('classes')
      .find({}, { projection: { _id: 0, id: 1, name: 1 } })
      .toArray();

    console.log(`Found ${classes.length} classes`);

    if (classes.length === 0) {
      return [];
    }

    const classWiseData = await Promise.all(
      classes.map(async (cls) => {
        try {
          // Get students in this class
          const students = await schoolDb.collection('students')
            .find({ class_id: cls.id }, { projection: { _id: 0, id: 1 } })
            .toArray();

          const studentIds = students.map(student => student.id);
          
          let totalCollected = 0;
          let totalPending = 0;

          // Only query fees if there are students in this class
          if (studentIds.length > 0) {
            // Build filter for academic year
            const feeFilter = { student_id: { $in: studentIds } };
            if (academic_year) {
              feeFilter.academic_year = academic_year;
            }
            
            const fees = await schoolDb.collection('fees')
              .find(feeFilter)
              .toArray();

            totalCollected = fees
              .filter(fee => fee.paid === true)
              .reduce((sum, fee) => sum + Math.abs(fee.amount || 0), 0);

            totalPending = fees
              .filter(fee => fee.paid === false)
              .reduce((sum, fee) => sum + Math.abs(fee.amount || 0), 0);
          }

          return {
            className: cls.name || 'Unknown Class',
            classId: cls.id,
            totalCollected: totalCollected || 0,
            totalPending: totalPending || 0,
            studentCount: students.length || 0
          };
        } catch (classError) {
          console.error(`Error processing class ${cls.name}:`, classError);
          return {
            className: cls.name || 'Unknown Class',
            classId: cls.id,
            totalCollected: 0,
            totalPending: 0,
            studentCount: 0
          };
        }
      })
    );

    // Filter out any null results and ensure proper formatting
    const validData = classWiseData.filter(item => item !== null);
    console.log(`Processed ${validData.length} class fee records`);
    
    return validData;

  } catch (error) {
    console.error('Error in getClassWiseFees:', error);
    return [];
  }
}

// ✅ School overview (for global dashboard)
async function getSchoolOverview(schoolDb) {
  try {
    const [
      total_students,
      total_teachers,
      fees
    ] = await Promise.all([
      schoolDb.collection('students').countDocuments({}),
      schoolDb.collection('teachers').countDocuments({}),
      schoolDb.collection('fees')
        .find({}, { projection: { _id: 0, amount: 1, paid: 1 } })
        .toArray()
    ]);

    const total_fee_collected = fees
      .filter(fee => fee.paid)
      .reduce((sum, fee) => sum + Math.abs(fee.amount || 0), 0);

    const total_fee_pending = fees
      .filter(fee => !fee.paid)
      .reduce((sum, fee) => sum + Math.abs(fee.amount || 0), 0);

    return {
      total_students,
      total_teachers,
      total_fee_collected,
      total_fee_pending
    };
  } catch (error) {
    console.error('Error fetching school overview:', error);
    return {
      total_students: 0,
      total_teachers: 0,
      total_fee_collected: 0,
      total_fee_pending: 0
    };
  }
}

// ✅ Salary statistics helper function
async function getSalaryStatistics(schoolDb, academic_year) {
  try {
    // Get all salaries (we can filter by academic year if needed in the future)
    const salaries = await schoolDb.collection('salaries')
      .find({}, { projection: { _id: 0, net_amount: 1, status: 1 } })
      .toArray();

    let total_paid = 0;
    let total_pending = 0;

    salaries.forEach(salary => {
      const amount = salary.net_amount || 0;
      if (salary.status === 'paid') {
        total_paid += amount;
      } else {
        total_pending += amount;
      }
    });

    return {
      total_paid,
      total_pending,
      total_amount: total_paid + total_pending
    };
  } catch (error) {
    console.error('Error fetching salary statistics:', error);
    return {
      total_paid: 0,
      total_pending: 0,
      total_amount: 0
    };
  }
}

module.exports = { getDashboardStats };
