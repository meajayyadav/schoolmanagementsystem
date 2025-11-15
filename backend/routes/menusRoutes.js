const express = require('express');
const {
  getMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  reorderMenus,
  getMenuByRole
} = require('../controllers/menusController');
const { requireAuthMiddleware } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(requireAuthMiddleware);

// Super admin can access all menus, school admin can access their school's menus
router.get('/', getMenus);
router.get('/my-menu', getMenuByRole);
router.post('/', createMenu);
router.put('/:id', updateMenu);
router.delete('/:id', deleteMenu);
router.put('/reorder/reorder', reorderMenus);

module.exports = router;