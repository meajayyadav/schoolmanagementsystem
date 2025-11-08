// backend/routes/api.js
const express = require('express');
const path = require('path');
const router = express.Router();

const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const schoolRoutes = require('./schoolRoutes');
const studentRoutes = require('./studentRoutes');
const classRoutes = require('./classRoutes');
const announcementRoutes = require('./announcementRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const examRoutes = require('./examRoutes');
const feeRoutes = require('./feeRoutes');
const gradeRoutes = require('./gradeRoutes');
const libraryRoutes = require('./libraryRoutes');
const reportCardRoutes = require('./reportCardRoutes');
const staffRoutes = require('./staffRoutes');
const timetableRoutes = require('./timetableRoutes');
const teacherRoutes = require('./teacherRoutes');
const userRoutes = require('./userRoutes');
const subjectRoutes = require('./subjectRoutes');
const systemCodeRoutes = require('./systemcodeRoutes');

// ✅ Mount all route modules
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/schools', schoolRoutes);
router.use('/students', studentRoutes);
router.use('/classes', classRoutes);
router.use('/announcements', announcementRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/exams', examRoutes);
router.use('/fees', feeRoutes);
router.use('/grades', gradeRoutes);
router.use('/library', libraryRoutes);
router.use('/report-cards', reportCardRoutes);
router.use('/staff', staffRoutes);
router.use('/timetable', timetableRoutes);
router.use('/teachers', teacherRoutes);
router.use('/users', userRoutes);
router.use('/subjects', subjectRoutes);
router.use("/system-code", systemCodeRoutes);


// ✅ Serve uploaded files globally
router.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

module.exports = router;
