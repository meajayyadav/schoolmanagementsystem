// src/controllers/announcementController.js
const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * Create an announcement
 * POST /api/announcements
 */
async function createAnnouncement(req, res) {
  try {
    const user = req.user;

    // ✅ Only school_admin or teacher can create announcements
    if (!['school_admin', 'teacher'].includes(user.role)) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const centralDb = getCentralDb();
    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const payload = {
      ...req.body,
      id: req.body.id || uuidv4(),
      created_by: user.id,
      created_at: new Date().toISOString(),
    };

    await schoolDb.collection('announcements').insertOne(payload);
    return res.json(payload);
  } catch (err) {
    console.error('createAnnouncement error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get all announcements (filtered by user role)
 * GET /api/announcements
 */
async function listAnnouncements(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();

    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // ✅ Teachers see all, students/parents see only targeted announcements
    let query = {};
    if (user.role !== 'school_admin') {
      query = {
        $or: [
          { target_roles: { $size: 0 } },
          { target_roles: user.role },
          { target_roles: { $exists: false } },
        ],
      };
    }

    const announcements = await schoolDb
      .collection('announcements')
      .find(query, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .toArray();

    return res.json(announcements);
  } catch (err) {
    console.error('listAnnouncements error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get single announcement
 * GET /api/announcements/:id
 */
async function getAnnouncement(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;
    const centralDb = getCentralDb();

    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);
    const announcement = await schoolDb
      .collection('announcements')
      .findOne({ id }, { projection: { _id: 0 } });

    if (!announcement) return res.status(404).json({ detail: 'Announcement not found' });

    return res.json(announcement);
  } catch (err) {
    console.error('getAnnouncement error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = {
  createAnnouncement,
  listAnnouncements,
  getAnnouncement,
};
