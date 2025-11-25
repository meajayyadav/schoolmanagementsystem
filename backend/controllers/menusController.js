const { getCentralDb, getSchoolDbByName } = require('../db');
const { makeMenu } = require('../utils/menu');
const { ObjectId } = require('mongodb');

// Get all menus based on user role
exports.getMenus = async (req, res) => {
  try {
    const { user } = req;
    const { school_id } = req.query;
    
    let db, menusCollection;

    if (user.role === 'super_admin') {
      db = getCentralDb();
      menusCollection = db.collection('menus');
      
      let filter = {};
      if (school_id) {
        filter.school_id = school_id;
      }

      const menus = await menusCollection.find(filter).sort({ order: 1, created_at: 1 }).toArray();
      
      // Populate school names for super admin
      const schoolsCollection = db.collection('schools');
      const schools = await schoolsCollection.find({}).toArray();
      const schoolMap = {};
      schools.forEach(school => {
        schoolMap[school.id] = school.name;
      });

      const menusWithSchoolNames = menus.map(menu => ({
        ...menu,
        school_name: schoolMap[menu.school_id] || 'Unknown School'
      }));

      return res.json({
        success: true,
        data: menusWithSchoolNames
      });
    } else {
      // For non-super admin users, get menus from CENTRAL database with school_id = null (global menus)
      db = getCentralDb();
      menusCollection = db.collection('menus');
      
      const menus = await menusCollection.find({ 
        school_id: null, // Get global menus
        is_active: true,
        roles: user.role // Filter by user's role
      }).sort({ order: 1, created_at: 1 }).toArray();

      return res.json({
        success: true,
        data: menus
      });
    }
  } catch (error) {
    // console.error('Error fetching menus:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching menus',
      error: error.message
    });
  }
};

// Get menus by user role for navigation - FIXED VERSION
exports.getMenuByRole = async (req, res) => {
  try {
    const { user } = req;
    // console.log('Fetching menus for user:', { 
    //   id: user.id, 
    //   role: user.role, 
    //   school_id: user.school_id,
    //   school_db_name: user.school_db_name 
    // });

    let db, menusCollection;

    // ALL users get menus from CENTRAL database
    db = getCentralDb();
    menusCollection = db.collection('menus');

    const filter = {
      is_active: true,
      roles: user.role // Filter by user's role
    };

    // For non-super admin users, also filter by school_id = null (global menus)
    // OR by their specific school_id if you want school-specific menus
    if (user.role !== 'super_admin') {
      filter.school_id = null; // Get global menus for all non-super admin users
    }

    // console.log('Database filter for menus:', filter);

    const menus = await menusCollection
      .find(filter)
      .sort({ order: 1, created_at: 1 })
      .project({ name: 1, path: 1, icon: 1, order: 1, roles: 1, is_active: 1 })
      .toArray();

    // console.log('Found menus:', menus.length, menus);

    res.json({
      success: true,
      data: menus
    });
  } catch (error) {
    // console.error('Error fetching user menu:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching menu',
      error: error.message
    });
  }
};

// Create new menu - UPDATED to always create in central DB for global menus
exports.createMenu = async (req, res) => {
  try {
    const { user } = req;
    const { name, path, icon, roles, order, is_active } = req.body;

    if (user.role !== 'super_admin' && user.role !== 'school_admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to create menus'
      });
    }

    // ALWAYS create menus in central database for global access
    const db = getCentralDb();
    const menusCollection = db.collection('menus');
    
    // For global menus that apply to all schools, use school_id = null
    const school_id = null;

    // Check if menu already exists for this path (global menu)
    const existingMenu = await menusCollection.findOne({ 
      path, 
      school_id: school_id 
    });

    if (existingMenu) {
      return res.status(400).json({
        success: false,
        message: 'Menu with this path already exists'
      });
    }

    const menuData = makeMenu({
      name,
      path,
      icon,
      roles,
      order: order || 0,
      is_active: is_active !== undefined ? is_active : true,
      school_id, // Always null for global menus
      created_by: user.id
    });

    const result = await menusCollection.insertOne(menuData);

    res.status(201).json({
      success: true,
      message: 'Menu created successfully',
      data: { ...menuData, _id: result.insertedId }
    });
  } catch (error) {
    // console.error('Error creating menu:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating menu',
      error: error.message
    });
  }
};

// Update menu - UPDATED to always update in central DB
exports.updateMenu = async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    const updateData = req.body;

    if (user.role !== 'super_admin' && user.role !== 'school_admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update menus'
      });
    }

    // ALWAYS update menus in central database
    const db = getCentralDb();
    const menusCollection = db.collection('menus');

    const filter = { id };

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    const result = await menusCollection.updateOne(
      filter,
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }

    const updatedMenu = await menusCollection.findOne({ id });

    res.json({
      success: true,
      message: 'Menu updated successfully',
      data: updatedMenu
    });
  } catch (error) {
    // console.error('Error updating menu:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating menu',
      error: error.message
    });
  }
};

// Delete menu - UPDATED to always delete from central DB
exports.deleteMenu = async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;

    if (user.role !== 'super_admin' && user.role !== 'school_admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete menus'
      });
    }

    // ALWAYS delete menus from central database
    const db = getCentralDb();
    const menusCollection = db.collection('menus');

    const filter = { id };

    const result = await menusCollection.deleteOne(filter);

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }

    res.json({
      success: true,
      message: 'Menu deleted successfully'
    });
  } catch (error) {
    // console.error('Error deleting menu:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting menu',
      error: error.message
    });
  }
};

// Reorder menus - UPDATED to always reorder in central DB
exports.reorderMenus = async (req, res) => {
  try {
    const { user } = req;
    const { menus } = req.body;

    if (user.role !== 'super_admin' && user.role !== 'school_admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to reorder menus'
      });
    }

    // ALWAYS reorder menus in central database
    const db = getCentralDb();
    const menusCollection = db.collection('menus');

    const bulkOps = menus.map(menu => ({
      updateOne: {
        filter: { id: menu.id },
        update: { 
          $set: { 
            order: menu.order,
            updated_at: new Date().toISOString()
          } 
        }
      }
    }));

    const result = await menusCollection.bulkWrite(bulkOps);

    res.json({
      success: true,
      message: 'Menus reordered successfully',
      data: result
    });
  } catch (error) {
    // console.error('Error reordering menus:', error);
    res.status(500).json({
      success: false,
      message: 'Error reordering menus',
      error: error.message
    });
  }
};