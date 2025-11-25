import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { feesApi, schoolsApi, studentsApi, classesApi, systemCodesApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  User,
  BookOpen,
  Calendar,
  IndianRupee,
  Loader2,
  CreditCard,
  FileText,
  CheckCircle2,
  XCircle,
  History
} from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function FeeCollection() {
  const { user } = useAuth();
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedSchoolCode, setSelectedSchoolCode] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [classLoading, setClassLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [allStudentFees, setAllStudentFees] = useState([]);
  const [isMonthFullyPaid, setIsMonthFullyPaid] = useState(false);
  const [monthStatusLoading, setMonthStatusLoading] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [feeMonths, setFeeMonths] = useState([]);
  const [loadingSystemCodes, setLoadingSystemCodes] = useState(false);
const [monthStatus, setMonthStatus] = useState({
  isFullyPaid: false,
  message: '',
  currentMonthPending: 0,
  previousMonthsPending: 0,
  totalPending: 0,
  hasFeesRecorded: false
});
  // Fee structure based on the image
  const [feeStructure, setFeeStructure] = useState({
    monthly_fee: 0,
    admission_fee: 0,
    registration_fee: 0,
    art_material: 0,
    transport: 0,
    books: 0,
    uniform: 0,
    fine: 0,
    others: 0,
    previous_balance: 0,
    discount_percent: 0
  });

  const [collectionData, setCollectionData] = useState({
    fee_month: '',
    date: new Date().toISOString().split('T')[0],
    deposit_amount: 0,
    payment_method: 'cash',
    academic_year: ''
  });

  // Load schools for super admin
  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadSchools();
    } else {
      setSelectedSchoolCode(user?.school_id || '');
    }
  }, [user]);

  // Load classes and system codes when school is selected
  useEffect(() => {
    if (selectedSchoolCode) {
      loadClasses();
      loadSystemCodes();
    } else {
      setClasses([]);
      setSelectedClass('');
      setStudents([]);
      setSelectedStudent(null);
      setAcademicYears([]);
      setFeeMonths([]);
    }
  }, [selectedSchoolCode]);

  // Load students when class is selected
  useEffect(() => {
    if (selectedClass && selectedSchoolCode) {
      loadClassStudents();
    } else {
      setStudents([]);
      setSelectedStudent(null);
    }
  }, [selectedClass, selectedSchoolCode]);

  // Load all student fees when student is selected
useEffect(() => {
  if (selectedStudent && selectedSchoolCode) {
    loadAllStudentFees();
  } else {
    setAllStudentFees([]);
    setMonthStatus({
  isFullyPaid: false,
  message: '',
  currentMonthPending: 0,
  previousMonthsPending: 0,
  totalPending: 0,
  hasFeesRecorded: false
});
    setIsMonthFullyPaid(false);
  }
}, [selectedStudent, selectedSchoolCode, collectionData.academic_year]);

  // Check month status when fee month changes
  useEffect(() => {
    if (selectedStudent && collectionData.fee_month) {
      checkMonthStatus();
    } else {
      setIsMonthFullyPaid(false);
    }
  }, [collectionData.fee_month, allStudentFees]);

  const loadSchools = async () => {
    try {
      const response = await schoolsApi.getAll();
      setSchools(Array.isArray(response.data) ? response.data : []);
    } catch {
      toast.error('Failed to load schools');
    }
  };

  const loadSystemCodes = async () => {
    try {
      setLoadingSystemCodes(true);
      const schoolId = user.role === 'super_admin' ? selectedSchoolCode : user.school_id;
      
      if (!schoolId) {
        console.warn('No school ID available for fetching system codes');
        return;
      }

      const res = await systemCodesApi.getAll({ school_id: schoolId });
      
      // Filter and extract academic years (code: "AY")
      const academicYearCodes = res.data.filter(
        (c) => c.code === "AY" && Array.isArray(c.items)
      );
      
      // Filter and extract fee months (code: "FMNTH")
      const feeMonthCodes = res.data.filter(
        (c) => c.code === "FMNTH" && Array.isArray(c.items)
      );

      // Process academic years
      const academicYearOptions = academicYearCodes.length > 0 
        ? academicYearCodes[0].items.map((item) => ({
            value: item.value || item.label,
            label: item.label
          }))
        : [];

      // Process fee months
      const feeMonthOptions = feeMonthCodes.length > 0 
        ? feeMonthCodes[0].items.map((item) => ({
            value: item.value || item.label,
            label: item.label
          }))
        : [];

      setAcademicYears(academicYearOptions);
      setFeeMonths(feeMonthOptions);

      // Set default academic year if available
      if (academicYearOptions.length > 0 && !collectionData.academic_year) {
        setCollectionData(prev => ({
          ...prev,
          academic_year: academicYearOptions[0].value
        }));
      }

    } catch (error) {
      console.error('Error loading system codes:', error);
      toast.error('Failed to load academic years and months');
      setAcademicYears([]);
      setFeeMonths([]);
    } finally {
      setLoadingSystemCodes(false);
    }
  };

  const loadClasses = async () => {
    try {
      setClassLoading(true);
      const response = await classesApi.getBySchool(selectedSchoolCode);
      
      let classesData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          classesData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          classesData = response.data.data;
        } else if (Array.isArray(response.data.classes)) {
          classesData = response.data.classes;
        }
      }
      
      setClasses(classesData);
    } catch (error) {
      console.error('Error loading classes:', error);
      toast.error('Failed to load classes');
      setClasses([]);
    } finally {
      setClassLoading(false);
    }
  };

  const loadClassStudents = async () => {
    try {
      setStudentsLoading(true);
      const params = { 
        school_id: selectedSchoolCode,
        class_id: selectedClass,
        page: 1,
        limit: 100
      };
      
      const response = await studentsApi.getAll(params);
      
      let studentsData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          studentsData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          studentsData = response.data.data;
        } else if (Array.isArray(response.data.students)) {
          studentsData = response.data.students;
        }
      }
      
      // Fetch previous balance for each student
      const studentsWithFees = await Promise.all(
        studentsData.map(async (student) => {
          try {
            const feesResponse = await feesApi.getAll({
              student_id: student.id,
              school_id: selectedSchoolCode,
              status: 'pending'
            });
            
            let pendingFees = [];
            if (feesResponse.data) {
              if (Array.isArray(feesResponse.data)) {
                pendingFees = feesResponse.data;
              } else if (feesResponse.data.data && Array.isArray(feesResponse.data.data)) {
                pendingFees = feesResponse.data.data;
              }
            }
            
            const previousBalance = pendingFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);

            return {
              id: student.id,
              name: student.name || 'Unknown',
              roll_number: student.roll_number || 'N/A',
              admission_number: student.admission_number,
              class_id: student.class_id,
              class_name: student.class_name || `Class ${selectedClass}`,
              guardian_name: student.guardian_name || student.father_name,
              monthly_fee: student.monthly_fee || 0,
              admission_fee: student.admission_fee || 0,
              transport_fee: student.transport_fee || 0,
              previous_balance: previousBalance,
              pending_fees_count: pendingFees.length
            };
          } catch (error) {
            console.error(`Error loading fees for student ${student.id}:`, error);
            return { 
              id: student.id,
              name: student.name || 'Unknown',
              roll_number: student.roll_number || 'N/A',
              admission_number: student.admission_number,
              class_id: student.class_id,
              class_name: student.class_name || `Class ${selectedClass}`,
              guardian_name: student.guardian_name || student.father_name,
              monthly_fee: student.monthly_fee || 0,
              admission_fee: student.admission_fee || 0,
              transport_fee: student.transport_fee || 0,
              previous_balance: 0,
              pending_fees_count: 0
            };
          }
        })
      );
      
      setStudents(studentsWithFees);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadAllStudentFees = async () => {
    if (!selectedStudent) return;

    try {
      setMonthStatusLoading(true);
      
      // Get ALL fees for this student in the selected academic year
      const feesResponse = await feesApi.getAll({
        student_id: selectedStudent.id,
        school_id: selectedSchoolCode,
        academic_year: collectionData.academic_year
      });

      let allFees = [];
      if (feesResponse.data) {
        if (Array.isArray(feesResponse.data)) {
          allFees = feesResponse.data;
        } else if (feesResponse.data.data && Array.isArray(feesResponse.data.data)) {
          allFees = feesResponse.data.data;
        }
      }

      setAllStudentFees(allFees);

    } catch (error) {
      console.error('Error loading student fees:', error);
      toast.error('Failed to load fee history');
    } finally {
      setMonthStatusLoading(false);
    }
  };
const checkMonthStatus = () => {
  if (!collectionData.fee_month || allStudentFees.length === 0) {
    setMonthStatus({
      isFullyPaid: false,
      message: '',
      currentMonthPending: 0,
      previousMonthsPending: 0,
      totalPending: 0,
      hasFeesRecorded: false
    });
    setIsMonthFullyPaid(false);
    return;
  }

  const selectedMonth = collectionData.fee_month;

  // Get all months from feeMonths to understand the sequence
  const monthSequence = feeMonths.map(m => m.value);
  const currentMonthIndex = monthSequence.indexOf(selectedMonth);

  // Check if the selected month has any fees recorded
  const hasFeesForSelectedMonth = allStudentFees.some(fee => {
    const feeMonth = fee.fee_month || fee.month;
    return feeMonth === selectedMonth;
  });

  // Calculate total pending balance from ALL previous months (UNPAID FEES ONLY)
  let previousMonthsPending = 0;

  if (currentMonthIndex > 0) {
    // Check all months before the selected month for UNPAID pending balances
    for (let i = 0; i < currentMonthIndex; i++) {
      const previousMonth = monthSequence[i];
      const previousMonthFees = allStudentFees.filter(fee => {
        const feeMonth = fee.fee_month || fee.month;
        return feeMonth === previousMonth && !fee.paid; // Only unpaid fees
      });

      // Calculate pending amount for this previous month
      const previousMonthPending = previousMonthFees.reduce((sum, fee) => {
        if (fee.fee_breakdown && fee.fee_breakdown.due_balance) {
          return sum + (fee.fee_breakdown.due_balance || 0);
        }
        return sum + (Math.abs(fee.amount) || 0);
      }, 0);

      previousMonthsPending += previousMonthPending;
    }
  }

  // Check current month UNPAID fees only
  const currentMonthFees = allStudentFees.filter(fee => {
    const feeMonth = fee.fee_month || fee.month;
    return feeMonth === selectedMonth && !fee.paid; // Only unpaid fees
  });

  // Calculate current month status for UNPAID fees only
  const currentMonthPending = currentMonthFees.reduce((sum, fee) => {
    if (fee.fee_breakdown && fee.fee_breakdown.due_balance) {
      return sum + (fee.fee_breakdown.due_balance || 0);
    }
    return sum + (Math.abs(fee.amount) || 0);
  }, 0);

  // Determine the actual status
  let fullyPaid = false;
  let message = '';
  const selectedMonthLabel = feeMonths.find(m => m.value === collectionData.fee_month)?.label || collectionData.fee_month;

  if (!hasFeesForSelectedMonth) {
    // No fees recorded for this month yet - it's a new month
    fullyPaid = false;
    if (previousMonthsPending > 0) {
      message = `Ready to collect fees for ${selectedMonthLabel}. Includes ₹${previousMonthsPending.toFixed(2)} from previous months.`;
    } else {
      message = `Ready to collect fees for ${selectedMonthLabel}.`;
    }
  } else {
    // Fees exist for this month - check if they're fully paid
    fullyPaid = currentMonthPending <= 0 && previousMonthsPending <= 0;
    
    if (fullyPaid) {
      message = `All fees for ${selectedMonthLabel} and previous months are fully paid.`;
    } else if (previousMonthsPending > 0 && currentMonthPending <= 0) {
      message = `${selectedMonthLabel} fees are paid, but there's ₹${previousMonthsPending.toFixed(2)} pending from previous months.`;
    } else if (previousMonthsPending > 0 && currentMonthPending > 0) {
      message = `${selectedMonthLabel} has ₹${currentMonthPending.toFixed(2)} pending + ₹${previousMonthsPending.toFixed(2)} from previous months.`;
    } else {
      message = `${selectedMonthLabel} has ₹${currentMonthPending.toFixed(2)} pending.`;
    }
  }

  const totalPending = currentMonthPending + previousMonthsPending;

  setMonthStatus({
    isFullyPaid: fullyPaid,
    message,
    currentMonthPending,
    previousMonthsPending,
    totalPending,
    hasFeesRecorded: hasFeesForSelectedMonth
  });
  
  setIsMonthFullyPaid(fullyPaid);

  // Auto-populate fee structure
  if (!fullyPaid) {
    const hasCurrentMonthUnpaidFees = currentMonthFees.length > 0;
    const hasPendingFromPrevious = previousMonthsPending > 0;

    if (hasCurrentMonthUnpaidFees && currentMonthPending > 0) {
      // Current month has unpaid fees
      setFeeStructure(prev => ({
        ...prev,
        previous_balance: totalPending,
        monthly_fee: 0,
        admission_fee: 0,
        registration_fee: 0,
        art_material: 0,
        transport: 0,
        books: 0,
        uniform: 0,
        fine: 0,
        others: 0
      }));
    } else if (hasPendingFromPrevious) {
      // No current month unpaid fees but has pending from previous months
      // Check if we should include current month fee
      const shouldIncludeCurrentMonthFee = !hasFeesForSelectedMonth || currentMonthPending <= 0;
      
      setFeeStructure(prev => ({
        ...prev,
        previous_balance: previousMonthsPending,
        monthly_fee: shouldIncludeCurrentMonthFee ? (selectedStudent.monthly_fee || 1000) : 0,
        admission_fee: shouldIncludeCurrentMonthFee ? (selectedStudent.admission_fee || 0) : 0,
        transport: shouldIncludeCurrentMonthFee ? (selectedStudent.transport_fee || 0) : 0,
        registration_fee: 0,
        art_material: 0,
        books: 0,
        uniform: 0,
        fine: 0,
        others: 0
      }));
    } else {
      // New month with no pending balances
      setFeeStructure(prev => ({
        ...prev,
        monthly_fee: selectedStudent.monthly_fee || 1000,
        admission_fee: selectedStudent.admission_fee || 0,
        transport: selectedStudent.transport_fee || 0,
        registration_fee: 0,
        art_material: 0,
        books: 0,
        uniform: 0,
        fine: 0,
        others: 0,
        previous_balance: 0
      }));
    }
  } else {
    // Month is fully paid, don't auto-populate
    setFeeStructure(prev => ({
      ...prev,
      monthly_fee: 0,
      admission_fee: 0,
      registration_fee: 0,
      art_material: 0,
      transport: 0,
      books: 0,
      uniform: 0,
      fine: 0,
      others: 0,
      previous_balance: 0
    }));
  }
};

const handleStudentSelect = async (studentId) => {
  if (!studentId) {
    setSelectedStudent(null);
    setAllStudentFees([]);
    setMonthStatus({
  isFullyPaid: false,
  message: '',
  currentMonthPending: 0,
  previousMonthsPending: 0,
  totalPending: 0,
  hasFeesRecorded: false
});
    setIsMonthFullyPaid(false);
    return;
  }

  try {
    setLoading(true);
    const student = students.find(s => s.id === studentId);
    setSelectedStudent(student);
    
    // Reset fee structure with student defaults (current functionality)
    const defaultFeeStructure = {
      monthly_fee: student.monthly_fee || 1000,
      admission_fee: student.admission_fee || 0,
      registration_fee: 0,
      art_material: 0,
      transport: student.transport_fee || 0,
      books: 0,
      uniform: 0,
      fine: 0,
      others: 0,
      previous_balance: student.previous_balance || 0,
      discount_percent: 0
    };

    setFeeStructure(defaultFeeStructure);

    // Set default fee month to first available month if not set
    if (feeMonths.length > 0 && !collectionData.fee_month) {
      setCollectionData(prev => ({
        ...prev,
        fee_month: feeMonths[0].value
      }));
    }

  } catch (error) {
    console.error('Error loading student details:', error);
    toast.error('Failed to load student fee details');
  } finally {
    setLoading(false);
  }
};

  const handleFeeChange = (field, value) => {
    setFeeStructure(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const handleDiscountChange = (value) => {
    setFeeStructure(prev => ({
      ...prev,
      discount_percent: parseFloat(value) || 0
    }));
  };

  const calculateTotals = () => {
    const subtotal = Object.entries(feeStructure).reduce((total, [key, value]) => {
      if (key !== 'discount_percent' && key !== 'previous_balance') {
        return total + (value || 0);
      }
      return total;
    }, 0) + (feeStructure.previous_balance || 0);

    const discountAmount = (subtotal * (feeStructure.discount_percent || 0)) / 100;
    const totalAmount = subtotal - discountAmount;
    const dueBalance = totalAmount - (collectionData.deposit_amount || 0);

    return {
      subtotal,
      discountAmount,
      totalAmount,
      dueBalance
    };
  };

const handleFeeSubmission = async () => {
  try {
    if (!selectedStudent) {
      toast.error('Please select a student');
      return;
    }

    if (!collectionData.fee_month) {
      toast.error('Please select a fee month');
      return;
    }

    const { totalAmount, dueBalance } = calculateTotals();

    // Get all months from feeMonths to understand the sequence
    const monthSequence = feeMonths.map(m => m.value);
    const currentMonthIndex = monthSequence.indexOf(collectionData.fee_month);

    // Calculate pending balance from ALL previous months
    let previousMonthsPending = 0;
    const previousMonthFeesToUpdate = [];

    if (currentMonthIndex > 0) {
      // Check all months before the selected month for pending balances
      for (let i = 0; i < currentMonthIndex; i++) {
        const previousMonth = monthSequence[i];
        const previousMonthFees = allStudentFees.filter(fee => {
          const feeMonth = fee.fee_month || fee.month;
          return feeMonth === previousMonth && !fee.paid;
        });

        // Calculate pending amount for this previous month
        const previousMonthPending = previousMonthFees.reduce((sum, fee) => {
          if (fee.fee_breakdown && fee.fee_breakdown.due_balance) {
            return sum + (fee.fee_breakdown.due_balance || 0);
          }
          return sum + (Math.abs(fee.amount) || 0);
        }, 0);

        if (previousMonthPending > 0) {
          previousMonthsPending += previousMonthPending;
          // Store the fees that need to be updated
          previousMonthFeesToUpdate.push({
            month: previousMonth,
            fees: previousMonthFees,
            pendingAmount: previousMonthPending
          });
        }
      }
    }

    // Check current month fees
    const currentMonthFees = allStudentFees.filter(fee => {
      const feeMonth = fee.fee_month || fee.month;
      return feeMonth === collectionData.fee_month && !fee.paid;
    });

    const currentMonthPending = currentMonthFees.reduce((sum, fee) => {
      if (fee.fee_breakdown && fee.fee_breakdown.due_balance) {
        return sum + (fee.fee_breakdown.due_balance || 0);
      }
      return sum + (Math.abs(fee.amount) || 0);
    }, 0);

    // Determine if this payment includes previous month balances
    const includesPreviousMonths = previousMonthsPending > 0;
    const isBalanceAdjustment = includesPreviousMonths || currentMonthPending > 0;
    
    // Determine if the payment fully covers all pending amounts
    const isFullyPaid = collectionData.deposit_amount >= totalAmount;

    // Create the main fee record
    const feeData = {
      student_id: selectedStudent.id,
      fee_type: includesPreviousMonths ? 'BALANCE_ADJUSTMENT' : 'CONSOLIDATED_FEE',
      amount: totalAmount,
      description: includesPreviousMonths 
        ? `Balance adjustment for ${collectionData.fee_month} - Includes ₹${previousMonthsPending.toFixed(2)} from previous months`
        : `Consolidated Fee for ${collectionData.fee_month}`,
      due_date: collectionData.date,
      academic_year: collectionData.academic_year,
      school_id: user.role === 'super_admin' ? selectedSchoolCode : undefined,
      fee_month: collectionData.fee_month,
      paid: isFullyPaid,
      payment_method: isFullyPaid ? collectionData.payment_method : '',
      payment_date: isFullyPaid ? collectionData.date : null,
      fee_breakdown: {
        monthly_fee: feeStructure.monthly_fee,
        admission_fee: feeStructure.admission_fee,
        registration_fee: feeStructure.registration_fee,
        art_material: feeStructure.art_material,
        transport: feeStructure.transport,
        books: feeStructure.books,
        uniform: feeStructure.uniform,
        fine: feeStructure.fine,
        others: feeStructure.others,
        previous_balance: feeStructure.previous_balance,
        discount_percent: feeStructure.discount_percent,
        subtotal: subtotal,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        deposit_amount: collectionData.deposit_amount,
        due_balance: dueBalance,
        is_balance_adjustment: includesPreviousMonths,
        previous_months_pending: previousMonthsPending,
        current_month_pending: currentMonthPending
      }
    };

    const response = await feesApi.create(feeData);

    // If payment includes previous months and is fully paid, update the previous month fees
    if (includesPreviousMonths && isFullyPaid) {
      try {
        // Update all previous month fees to mark them as paid
        for (const previousMonthData of previousMonthFeesToUpdate) {
          for (const fee of previousMonthData.fees) {
            await feesApi.updatePayment(fee.id, {  // Changed from updateFeePayment to updatePayment
              paid: true,
              payment_method: collectionData.payment_method,
              payment_date: collectionData.date,
              notes: `Balance collected in ${collectionData.fee_month} payment`
            });
          }
        }
        
        // Also update current month fees if any
        if (currentMonthFees.length > 0) {
          for (const fee of currentMonthFees) {
            await feesApi.updatePayment(fee.id, {  // Changed from updateFeePayment to updatePayment
              paid: true,
              payment_method: collectionData.payment_method,
              payment_date: collectionData.date,
              notes: `Balance collected in ${collectionData.fee_month} payment`
            });
          }
        }
      } catch (updateError) {
        console.error('Error updating previous month fees:', updateError);
        // Don't show error to user as the main fee was created successfully
      }
    }

    const selectedMonthLabel = feeMonths.find(m => m.value === collectionData.fee_month)?.label || collectionData.fee_month;
    
    if (isFullyPaid) {
      if (includesPreviousMonths) {
        toast.success(`Fees submitted! ${selectedMonthLabel} and previous months are now fully paid.`);
      } else {
        toast.success(`Fees for ${selectedMonthLabel} submitted and fully paid!`);
      }
    } else {
      toast.success(`Fees for ${selectedMonthLabel} submitted. Due balance: ₹${dueBalance.toFixed(2)}`);
    }
    
    // Reset form but keep student selected
    setFeeStructure({
      monthly_fee: selectedStudent.monthly_fee || 1000,
      admission_fee: selectedStudent.admission_fee || 0,
      registration_fee: 0,
      art_material: 0,
      transport: selectedStudent.transport_fee || 0,
      books: 0,
      uniform: 0,
      fine: 0,
      others: 0,
      previous_balance: dueBalance > 0 ? dueBalance : 0,
      discount_percent: 0
    });
    
    setCollectionData(prev => ({
      ...prev,
      deposit_amount: 0,
      payment_method: 'cash'
    }));
    
    // Reload fees to update history
    loadAllStudentFees();
    
  } catch (error) {
    console.error('Fee submission error:', error);
    if (error.response?.data?.detail) {
      toast.error(error.response.data.detail);
    } else {
      toast.error('Failed to submit fees');
    }
  }
};

const handleResetFeeStructure = () => {
  if (selectedStudent) {
    setFeeStructure({
      monthly_fee: selectedStudent.monthly_fee || 1000,
      admission_fee: selectedStudent.admission_fee || 0,
      registration_fee: 0,
      art_material: 0,
      transport: selectedStudent.transport_fee || 0,
      books: 0,
      uniform: 0,
      fine: 0,
      others: 0,
      previous_balance: selectedStudent.previous_balance || 0,
      discount_percent: 0
    });
    toast.info('Fee structure reset to student defaults');
  }
};
  const { subtotal, discountAmount, totalAmount, dueBalance } = calculateTotals();

  // Group fees by month for history display
  const groupFeesByMonth = () => {
    const grouped = {};
    
    allStudentFees.forEach(fee => {
      const feeMonth = fee.fee_month || fee.month;
      if (!feeMonth) return; // Skip fees without month
      
      const monthLabel = feeMonths.find(m => m.value === feeMonth)?.label || feeMonth;
      
      if (!grouped[monthLabel]) {
        grouped[monthLabel] = {
          fees: [],
          totalAmount: 0,
          paidAmount: 0,
          isFullyPaid: true
        };
      }
      
      grouped[monthLabel].fees.push(fee);
      grouped[monthLabel].totalAmount += Math.abs(fee.amount);
      
      if (fee.paid) {
        grouped[monthLabel].paidAmount += Math.abs(fee.amount);
      } else {
        grouped[monthLabel].isFullyPaid = false;
      }
    });
    
    return grouped;
  };

  const groupedFees = groupFeesByMonth();

  // Safe array access for rendering
  const safeClasses = Array.isArray(classes) ? classes : [];
  const safeStudents = Array.isArray(students) ? students : [];
  const safeSchools = Array.isArray(schools) ? schools : [];

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Fees Collection</h1>
            <p className="text-gray-600">
              Collect student fees with monthly tracking and history
            </p>
          </div>
        </div>

        {/* School, Class, and Student Selector */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* School Selector for Super Admin */}
              {user.role === 'super_admin' && (
                <div>
                  <Label htmlFor="school-select" className="text-sm font-medium text-gray-700 mb-2 block">
                    Select School *
                  </Label>
                  <Select 
                    onValueChange={setSelectedSchoolCode} 
                    value={selectedSchoolCode}
                    disabled={classLoading}
                  >
                    <SelectTrigger>
                      {classLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </div>
                      ) : (
                        <SelectValue placeholder="Choose school" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {safeSchools.map((school) => (
                        <SelectItem key={school.id || school.code} value={school.id || school.code}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Class Selector */}
              <div>
                <Label htmlFor="class-select" className="text-sm font-medium text-gray-700 mb-2 block">
                  Select Class *
                </Label>
                <Select 
                  onValueChange={(value) => {
                    setSelectedClass(value);
                    setSelectedStudent(null);
                    setAllStudentFees([]);
                    setIsMonthFullyPaid(false);
                  }} 
                  value={selectedClass}
                  disabled={!selectedSchoolCode || classLoading}
                >
                  <SelectTrigger>
                    {classLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading classes...
                      </div>
                    ) : (
                      <SelectValue placeholder={safeClasses.length === 0 ? "No classes available" : "Choose class"} />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {safeClasses.length > 0 ? (
                      safeClasses.map((classItem) => (
                        <SelectItem key={classItem.id} value={classItem.id}>
                          {classItem.name} {classItem.section && `- ${classItem.section}`}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-classes" disabled>
                        No classes found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {safeClasses.length === 0 && selectedSchoolCode && !classLoading && (
                  <p className="text-sm text-red-500 mt-1">No classes available for this school</p>
                )}
              </div>

              {/* Student Selector */}
              <div>
                <Label htmlFor="student-select" className="text-sm font-medium text-gray-700 mb-2 block">
                  Select Student *
                </Label>
                <Select 
                  onValueChange={handleStudentSelect} 
                  value={selectedStudent?.id || ''}
                  disabled={!selectedClass || studentsLoading}
                >
                  <SelectTrigger>
                    {studentsLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading students...
                      </div>
                    ) : (
                      <SelectValue placeholder={safeStudents.length === 0 ? "No students available" : "Choose student"} />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {safeStudents.length > 0 ? (
                      safeStudents.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{student.name}</span>
                            {student.previous_balance > 0 && (
                              <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 text-xs">
                                Due: ₹{student.previous_balance}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-students" disabled>
                        No students found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {safeStudents.length === 0 && selectedClass && !studentsLoading && (
                  <p className="text-sm text-red-500 mt-1">No students available in this class</p>
                )}
              </div>
            </div>

            {/* Student Info Summary */}
            {selectedStudent && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-blue-700">Registration No.</Label>
                    <p className="font-semibold text-blue-900">{selectedStudent.admission_number || selectedStudent.roll_number}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-blue-700">Student Name</Label>
                    <p className="font-semibold text-blue-900">{selectedStudent.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-blue-700">Guardian Name</Label>
                    <p className="font-semibold text-blue-900">{selectedStudent.guardian_name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-blue-700">Class</Label>
                    <p className="font-semibold text-blue-900">{selectedStudent.class_name}</p>
                  </div>
                </div>
                {selectedStudent.previous_balance > 0 && (
                  <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-red-700">Previous Balance Due</Label>
                        <p className="text-lg font-bold text-red-600">₹{selectedStudent.previous_balance}</p>
                      </div>
                      <Badge variant="destructive" className="text-sm">
                        {selectedStudent.pending_fees_count} Pending Fee(s)
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        {selectedStudent && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fees Collection Form - Left Column */}
            <div className="lg:col-span-2 space-y-6">
              <Card className={`border-2 ${isMonthFullyPaid ? 'border-green-300' : 'border-green-200'}`}>
                <CardHeader className={`${isMonthFullyPaid ? 'bg-green-100' : 'bg-green-50'} border-b ${isMonthFullyPaid ? 'border-green-300' : 'border-green-200'}`}>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <CreditCard size={24} />
                    Fees Collection Form
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      {selectedStudent.name}
                    </Badge>
                    {isMonthFullyPaid && (
                      <Badge className="bg-green-500 text-white ml-2">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Fully Paid
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Collection Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Academic Year *
                        </Label>
                        <Select 
                          value={collectionData.academic_year} 
                          onValueChange={(value) => setCollectionData(prev => ({ ...prev, academic_year: value }))}
                          disabled={isMonthFullyPaid || loadingSystemCodes || academicYears.length === 0}
                        >
                          <SelectTrigger className={isMonthFullyPaid ? 'bg-green-50' : ''}>
                            {loadingSystemCodes ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading...
                              </div>
                            ) : academicYears.length === 0 ? (
                              <div className="text-gray-500">No academic years</div>
                            ) : (
                              <SelectValue placeholder="Select Academic Year" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {academicYears.map((year) => (
                              <SelectItem key={year.value} value={year.value}>
                                {year.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {academicYears.length === 0 && !loadingSystemCodes && (
                          <p className="text-xs text-red-500 mt-1">No academic years configured in system</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Fee Month *
                        </Label>
                        <Select 
                          value={collectionData.fee_month} 
                          onValueChange={(value) => setCollectionData(prev => ({ ...prev, fee_month: value }))}
                          required
                          disabled={monthStatusLoading || loadingSystemCodes || feeMonths.length === 0}
                        >
                          <SelectTrigger className={isMonthFullyPaid ? 'bg-green-50' : ''}>
                            {monthStatusLoading || loadingSystemCodes ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {loadingSystemCodes ? 'Loading months...' : 'Checking...'}
                              </div>
                            ) : feeMonths.length === 0 ? (
                              <div className="text-gray-500">No months available</div>
                            ) : (
                              <SelectValue placeholder="Select month" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {feeMonths.map((month) => (
                              <SelectItem key={month.value} value={month.value}>
                                {month.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {feeMonths.length === 0 && !loadingSystemCodes && (
                          <p className="text-xs text-red-500 mt-1">No fee months configured in system</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {isMonthFullyPaid ? 
                            'This month is fully paid. Select a different month.' : 
                            'Select the month for which you\'re collecting fees'
                          }
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Payment Date *
                        </Label>
                        <Input
                          type="date"
                          value={collectionData.date}
                          onChange={(e) => setCollectionData(prev => ({ ...prev, date: e.target.value }))}
                          required
                          disabled={isMonthFullyPaid}
                          className={isMonthFullyPaid ? 'bg-green-50' : ''}
                        />
                      </div>
                      
                    </div>

                    {/* Month Status Notification */}
{collectionData.fee_month && (
  <div className={`p-3 rounded-lg border ${
    monthStatus.isFullyPaid ? 
    'bg-green-50 border-green-200 text-green-700' : 
    monthStatus.hasFeesRecorded ? 
    'bg-blue-50 border-blue-200 text-blue-700' : 
    'bg-gray-50 border-gray-200 text-gray-700'
  }`}>
    <div className="flex items-center gap-2">
      {monthStatusLoading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm font-medium">Checking fee status...</span>
        </>
      ) : (
        <>
          <Calendar size={16} />
          <span className="text-sm font-medium">{monthStatus.message}</span>
        </>
      )}
    </div>
    {!monthStatus.isFullyPaid && monthStatus.previousMonthsPending > 0 && (
      <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
        <p className="text-xs text-yellow-700">
          💡 <strong>Note:</strong> Previous month's pending balance (₹{monthStatus.previousMonthsPending.toFixed(2)}) is included in "Previous Balance"
        </p>
      </div>
    )}
    {!monthStatus.hasFeesRecorded && (
      <div className="mt-2 p-2 bg-gray-100 rounded border border-gray-300">
        <p className="text-xs text-gray-600">
          📝 <strong>New Month:</strong> No fees recorded yet for this month. You can collect fees now.
        </p>
      </div>
    )}
  </div>
)}

                    {/* Fee Particulars Table */}
                    <div className={`border rounded-lg ${isMonthFullyPaid ? 'opacity-60' : ''}`}>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Sr.</TableHead>
                            <TableHead>Particulars</TableHead>
                            <TableHead className="text-right w-40">Amount (₹)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[
                            { key: 'monthly_fee', label: 'MONTHLY FEE', number: 1 },
                            { key: 'admission_fee', label: 'ADMISSION FEE', number: 2 },
                            { key: 'registration_fee', label: 'REGISTRATION FEE', number: 3 },
                            { key: 'art_material', label: 'ART MATERIAL', number: 4 },
                            { key: 'transport', label: 'TRANSPORT', number: 5 },
                            { key: 'books', label: 'BOOKS', number: 6 },
                            { key: 'uniform', label: 'UNIFORM', number: 7 },
                            { key: 'fine', label: 'FINE', number: 8 },
                            { key: 'others', label: 'OTHERS', number: 9 },
                          ].map((item) => (
                            <TableRow key={item.key}>
                              <TableCell className="font-medium">{item.number}</TableCell>
                              <TableCell>{item.label}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={feeStructure[item.key]}
                                  onChange={(e) => handleFeeChange(item.key, e.target.value)}
                                  className="text-right font-semibold"
                                  min="0"
                                  step="0.01"
                                  disabled={isMonthFullyPaid}
                                />
                              </TableCell>
                            </TableRow>
                          ))}

                          {/* Previous Balance */}
                          <TableRow className="bg-gray-50">
                            <TableCell className="font-medium">10</TableCell>
                            <TableCell className="font-semibold">PREVIOUS BALANCE</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={feeStructure.previous_balance}
                                className="text-right font-semibold bg-gray-100"
                                readOnly
                              />
                            </TableCell>
                          </TableRow>

                          {/* Discount */}
                          <TableRow>
                            <TableCell className="font-medium">11</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">DISCOUNT IN FEE</span>
                                <Input
                                  type="number"
                                  value={feeStructure.discount_percent}
                                  onChange={(e) => handleDiscountChange(e.target.value)}
                                  className="w-20 text-center"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  disabled={isMonthFullyPaid}
                                />
                                <span className="font-semibold">%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-red-600 text-lg">
                              -₹{discountAmount.toFixed(2)}
                            </TableCell>
                          </TableRow>

                          {/* Total Row */}
                          <TableRow className="bg-green-50 border-t-2 border-green-200">
                            <TableCell colSpan={2} className="font-bold text-right text-lg">
                              TOTAL
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-700 text-xl">
                              ₹{totalAmount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      {/* Add this in the Fees Collection Form section, after the fee particulars table */}
<div className="flex justify-between items-center">
  <div className="text-sm text-gray-500">
    {feeStructure.previous_balance > 0 && (
      <p>Includes ₹{feeStructure.previous_balance.toFixed(2)} pending balance</p>
    )}
  </div>
  <Button 
    type="button" 
    variant="outline" 
    size="sm"
    onClick={handleResetFeeStructure}
    disabled={isMonthFullyPaid}
  >
    Reset to Defaults
  </Button>
</div>
                    </div>

                    {/* Deposit and Balance Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          DEPOSIT AMOUNT (₹) *
                        </Label>
                        <Input
                          type="number"
                          value={collectionData.deposit_amount}
                          onChange={(e) => setCollectionData(prev => ({ 
                            ...prev, 
                            deposit_amount: parseFloat(e.target.value) || 0 
                          }))}
                          className="text-lg font-semibold h-12 text-center"
                          min="0"
                          step="0.01"
                          max={totalAmount}
                          placeholder="Enter deposit amount"
                          disabled={isMonthFullyPaid}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          PAYMENT METHOD *
                        </Label>
                        <Select 
                          value={collectionData.payment_method} 
                          onValueChange={(value) => setCollectionData(prev => ({ ...prev, payment_method: value }))}
                          disabled={isMonthFullyPaid}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">💵 Cash</SelectItem>
                            <SelectItem value="card">💳 Card</SelectItem>
                            <SelectItem value="upi">📱 UPI</SelectItem>
                            <SelectItem value="cheque">🏦 Cheque</SelectItem>
                            <SelectItem value="bank_transfer">🏛️ Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className={`p-4 rounded-lg border-2 ${
                        isMonthFullyPaid ? 
                        'bg-green-100 border-green-300' :
                        dueBalance > 0 ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'
                      }`}>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          DUE-ABLE BALANCE
                        </Label>
                        <p className={`text-3xl font-bold text-center ${
                          isMonthFullyPaid ? 'text-green-600' :
                          dueBalance > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {isMonthFullyPaid ? '₹0.00' : `₹${Math.max(0, dueBalance).toFixed(2)}`}
                        </p>
                        <p className={`text-sm text-center mt-1 ${
                          isMonthFullyPaid ? 'text-green-600' :
                          dueBalance > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {isMonthFullyPaid ? 'Fully Paid' : dueBalance > 0 ? 'Amount Due' : 'Fully Paid'}
                        </p>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-center pt-4">
                      <Button 
  onClick={handleFeeSubmission}
  className={`px-12 py-3 text-lg font-semibold h-14 min-w-48 ${
    isMonthFullyPaid ? 
    'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' : 
    'bg-green-600 hover:bg-green-700 text-white'
  }`}
  size="lg"
  disabled={loading || isMonthFullyPaid || !collectionData.fee_month || monthStatusLoading || !collectionData.academic_year}
>
  {loading ? (
    <div className="flex items-center gap-2">
      <Loader2 className="h-5 w-5 animate-spin" />
      Processing...
    </div>
  ) : isMonthFullyPaid ? (
    <div className="flex items-center gap-2">
      <CheckCircle2 size={20} />
      Already Paid
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <FileText size={20} />
      <IndianRupee size={20} />
      Submit Fees for {collectionData.fee_month ? feeMonths.find(m => m.value === collectionData.fee_month)?.label : 'Month'}
    </div>
  )}
</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fees History - Right Column */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="bg-blue-50 border-b border-blue-200">
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <History size={20} />
                    Fees History
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      {selectedStudent.name}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {monthStatusLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      </div>
                    ) : Object.keys(groupedFees).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <History className="mx-auto h-12 w-12 mb-3 opacity-50" />
                        <p>No fee history found</p>
                      </div>
                    ) : (
                      Object.entries(groupedFees)
                        .sort(([a], [b]) => {
                          // Sort by month value instead of label for proper ordering
                          const monthA = feeMonths.find(m => m.label === a)?.value || a;
                          const monthB = feeMonths.find(m => m.label === b)?.value || b;
                          return monthB.localeCompare(monthA);
                        })
                        .map(([month, data]) => (
                          <div key={month} className="border rounded-lg p-4 bg-white">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold text-gray-900">{month}</h3>
                              <Badge 
  className={
    data.isFullyPaid ? "bg-green-100 text-green-800" : 
    data.paidAmount > 0 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
  }
>
  {data.isFullyPaid ? 'Fully Paid' : data.paidAmount > 0 ? 'Partial' : 'Pending'}
</Badge>
                            </div>
                            
                            <div className="space-y-2">
                              {data.fees.map((fee, index) => {
  const feeAmount = Math.abs(fee.amount);
  const depositAmount = fee.fee_breakdown?.deposit_amount || 0;
  const dueBalance = fee.fee_breakdown?.due_balance || 0;
  const isPartialPayment = depositAmount > 0 && dueBalance > 0;
  
  return (
    <div key={fee.id || index} className="flex items-center justify-between py-2 border-b last:border-b-0">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          fee.paid ? 'bg-green-500' : isPartialPayment ? 'bg-yellow-500' : 'bg-red-500'
        }`} />
        <div>
          <span className="text-sm font-medium">{fee.fee_type}</span>
          {isPartialPayment && (
            <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 text-xs">
              Partial
            </Badge>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-gray-900">
          ₹{feeAmount.toFixed(2)}
        </p>
        {isPartialPayment && (
          <div className="text-xs text-gray-500">
            <div>Paid: ₹{depositAmount.toFixed(2)}</div>
            <div>Due: ₹{dueBalance.toFixed(2)}</div>
          </div>
        )}
        {fee.paid && !isPartialPayment && (
          <p className="text-xs text-green-600">Fully Paid</p>
        )}
        <p className="text-xs text-gray-500">
          {fee.payment_date ? new Date(fee.payment_date).toLocaleDateString() : 'Not Paid'}
        </p>
      </div>
    </div>
  );
})}
                            </div>
                            
                            <div className="flex justify-between items-center mt-3 pt-3 border-t">
                              <span className="text-sm font-medium">Total:</span>
                              <span className="font-bold text-blue-700">₹{data.totalAmount.toFixed(2)}</span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Empty States */}
        {!selectedStudent && selectedClass && (
          <Card className="text-center py-12">
            <CardContent>
              <User className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Student</h3>
              <p className="text-gray-500">Choose a student from the dropdown above to collect fees</p>
            </CardContent>
          </Card>
        )}

        {!selectedClass && (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select School and Class</h3>
              <p className="text-gray-500">Choose a school and class to view students and collect fees</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}