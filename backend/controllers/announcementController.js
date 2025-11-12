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
 * Get all announcements
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

/**
 * Update an announcement
 * PUT /api/announcements/:id
 */
async function updateAnnouncement(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!['school_admin', 'teacher'].includes(user.role)) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const centralDb = getCentralDb();
    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0 } });
    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const existing = await schoolDb.collection('announcements').findOne({ id });
    if (!existing) return res.status(404).json({ detail: 'Announcement not found' });

    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString(),
    };

    await schoolDb.collection('announcements').updateOne(
      { id },
      { $set: updateData }
    );

    const updated = await schoolDb.collection('announcements').findOne({ id }, { projection: { _id: 0 } });
    return res.json(updated);
  } catch (err) {
    console.error('updateAnnouncement error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Delete an announcement
 * DELETE /api/announcements/:id
 */
async function deleteAnnouncement(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!['school_admin', 'teacher'].includes(user.role)) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const centralDb = getCentralDb();
    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0 } });
    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const result = await schoolDb.collection('announcements').deleteOne({ id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ detail: 'Announcement not found' });
    }

    return res.json({ detail: 'Announcement deleted successfully' });
  } catch (err) {
    console.error('deleteAnnouncement error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get unread announcement count
 * GET /api/announcements/unread-count
 */
async function getUnreadCount(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();

    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0 } });
    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const readIds = await schoolDb
      .collection('announcement_reads')
      .find({ user_id: user.id }, { projection: { announcement_id: 1 } })
      .toArray();

    const readIdsSet = readIds.map((r) => r.announcement_id);

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

    if (readIdsSet.length > 0) {
      query.id = { $nin: readIdsSet };
    }

    const count = await schoolDb.collection('announcements').countDocuments(query);
    return res.json({ count });
  } catch (err) {
    console.error('getUnreadCount error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
/**
 * Mark an announcement as read
 * POST /api/announcements/:id/mark-read
 */
async function markAsRead(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;
    const centralDb = getCentralDb();

    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0 } });
    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Prevent duplicate entries
    const alreadyRead = await schoolDb
      .collection('announcement_reads')
      .findOne({ user_id: user.id, announcement_id: id });

    if (!alreadyRead) {
      await schoolDb.collection('announcement_reads').insertOne({
  id: uuidv4(),
  announcement_id: id,
  user_id: user.id,
  read_at: new Date().toISOString(),
}, { writeConcern: { w: "majority" } });

    }

    return res.json({ detail: 'Marked as read' });
  } catch (err) {
    console.error('markAsRead error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Mark ALL announcements as read for the current user
 * POST /api/announcements/mark-all-read
 */
async function markAllAsRead(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();

    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0 } });
    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Determine which announcements this user can see
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
      .find(query, { projection: { id: 1 } })
      .toArray();

    if (announcements.length === 0) {
      return res.json({ detail: 'No announcements found to mark as read' });
    }

    const existingReads = await schoolDb
      .collection('announcement_reads')
      .find({ user_id: user.id }, { projection: { announcement_id: 1 } })
      .toArray();

    const alreadyReadIds = new Set(existingReads.map((r) => r.announcement_id));

    const newReads = announcements
      .filter((a) => !alreadyReadIds.has(a.id))
      .map((a) => ({
        id: uuidv4(),
        announcement_id: a.id,
        user_id: user.id,
        read_at: new Date().toISOString(),
      }));

    if (newReads.length > 0) {
      await schoolDb.collection('announcement_reads').insertMany(newReads);
    }

    return res.json({ detail: 'All announcements marked as read' });
  } catch (err) {
    console.error('markAllAsRead error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = {
  createAnnouncement,
  listAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
