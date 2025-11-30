const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  createSalary,
  getAllSalaries,
  getSalaryById,
  updateSalary,
  deleteSalary,
  paySalary,
  getSalaryStatistics,
  getEmployees
} = require('../controllers/salaryController');

// Get employees for salary assignment
router.get('/employees', requireAuthMiddleware, getEmployees);

// Get salary statistics
router.get('/statistics', requireAuthMiddleware, getSalaryStatistics);

// CRUD operations
router.post('/', requireAuthMiddleware, createSalary);
router.get('/', requireAuthMiddleware, getAllSalaries);
router.get('/:id', requireAuthMiddleware, getSalaryById);
router.put('/:id', requireAuthMiddleware, updateSalary);
router.delete('/:id', requireAuthMiddleware, deleteSalary);

// Pay salary
router.patch('/:id/pay', requireAuthMiddleware, paySalary);

module.exports = router;

