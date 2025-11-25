const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const { getDashboardStats } = require('../controllers/dashboardController');

// Enhanced dashboard stats route with query parameter validation
router.get('/stats', requireAuthMiddleware, (req, res) => {
  // Extract and validate query parameters
  const { school_id, academic_year, month, period } = req.query;
  
  // Validate period parameter
  const validPeriods = ['weekly', 'monthly', 'quarterly', 'yearly'];
  if (period && !validPeriods.includes(period)) {
    return res.status(400).json({
      detail: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
    });
  }

  // Validate month parameter if provided
  const validMonths = [
    'All', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  if (month && !validMonths.includes(month)) {
    return res.status(400).json({
      detail: `Invalid month. Must be one of: ${validMonths.join(', ')}`
    });
  }

  // Proceed with the controller
  getDashboardStats(req, res);
});

// Additional dashboard endpoints for specific data
router.get('/academic-years', requireAuthMiddleware, async (req, res) => {
  try {
    const { school_id } = req.query;
    // This would call a separate controller function for academic years
    // For now, we'll handle it in the main stats endpoint
    res.json({ 
      detail: 'Use /stats endpoint to get academic years data' 
    });
  } catch (error) {
    console.error('Academic years error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Monthly trends endpoint (optional - for more detailed monthly data)
router.get('/monthly-trends', requireAuthMiddleware, async (req, res) => {
  try {
    const { school_id, academic_year } = req.query;
    
    // Validate required parameters
    if (!academic_year) {
      return res.status(400).json({
        detail: 'academic_year parameter is required'
      });
    }

    // This would call a specialized monthly trends controller
    // For now, use the main stats endpoint with month filter
    res.json({ 
      detail: 'Use /stats endpoint with academic_year and month parameters for monthly trends' 
    });
  } catch (error) {
    console.error('Monthly trends error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Fee analytics endpoint (optional - for detailed fee analysis)
router.get('/fee-analytics', requireAuthMiddleware, async (req, res) => {
  try {
    const { school_id, academic_year, month, fee_type } = req.query;
    
    // This would call a specialized fee analytics controller
    // For now, use the main stats endpoint
    res.json({ 
      detail: 'Use /stats endpoint for fee analytics with academic_year and month parameters' 
    });
  } catch (error) {
    console.error('Fee analytics error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

module.exports = router;