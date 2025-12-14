// src/middleware/tenantMiddleware.js
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * tenantMiddleware
 * - resolves req.headers.host -> central DB record (by subdomain)
 * - attaches req.school, req.tenant (code), req.db (school db handle)
 * - Custom domain support is commented for future use
 */
async function tenantMiddleware(req, res, next) {
  try {
    const hostHeader = req.headers.host || '';
    const host = hostHeader.split(':')[0].toLowerCase(); // strip port
    if (!host) return res.status(400).json({ detail: 'Host header missing' });

    const centralDb = await getCentralDb();

    // Extract subdomain from hostname
    // Example: school1.example.com -> "school1"
    const parts = host.split('.');
    let subdomainPart = null;
    
    // If we have 3+ parts, it's a subdomain (e.g., school1.example.com)
    if (parts.length >= 3) {
      subdomainPart = parts[0];
    } 
    // If we have 2 parts, treat first part as school identifier
    else if (parts.length === 2) {
      subdomainPart = parts[0];
    }

    if (!subdomainPart) {
      return res.status(404).json({ detail: 'School not found' });
    }

    // --------------------------------------------
    // ✅ SUBDOMAIN SUPPORT (ACTIVE)
    // --------------------------------------------
    const school = await centralDb.collection('schools').findOne({
      subdomain: subdomainPart,
    });

    // --------------------------------------------
    // ✅ CUSTOM DOMAIN SUPPORT (COMMENTED FOR FUTURE USE)
    // --------------------------------------------
    // To enable custom domain support:
    // 1. Uncomment the code below
    // 2. Update the findOne query to include custom_domain
    // 3. Test with custom domains
    //
    // const school = await centralDb.collection('schools').findOne({
    //   $or: [
    //     { subdomain: subdomainPart },
    //     { custom_domain: host }, // Match exact custom domain
    //   ],
    // });
    // --------------------------------------------

    if (!school) {
      return res.status(404).json({ detail: 'School not found' });
    }

    req.school = school;
    req.tenant = school.code;

    // attach school db handle
    const schoolDb = getSchoolDbByName(school.db_name);
    req.db = schoolDb;

    return next();
  } catch (err) {
    console.error('tenantMiddleware error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = tenantMiddleware;
