// middleware/tenantResolver.js
const { getSchoolDbByCode, getSchoolDbBySubdomain, getCentralDb, getSchoolDbByName } = require("../db");

module.exports = async function tenantResolver(req, res, next) {
  try {
    // ✅ PRIORITY 1: Check X-Tenant header (sent by frontend when subdomain is detected)
    // This is more reliable than Host header when frontend uses REACT_APP_BACKEND_URL
    const xTenantHeader = req.headers['x-tenant'] || req.headers['X-Tenant'];
    
    if (xTenantHeader) {
      const tenant = xTenantHeader.toLowerCase().trim();
      console.log(`[TENANT] X-Tenant header detected: ${tenant}`);
      try {
        const { db: schoolDb, schoolCode, schoolId } = await getSchoolDbBySubdomain(tenant);
        req.schoolCode = schoolCode;
        req.schoolDb = schoolDb;
        req.schoolSubdomain = tenant;
        req.schoolId = schoolId;
        console.log(`[TENANT] School resolved from X-Tenant header: Code=${schoolCode}, ID=${schoolId}, DB=${schoolDb.databaseName}`);
        return next();
      } catch (err) {
        console.warn(`[TENANT] X-Tenant lookup failed for "${tenant}", trying code lookup...`, err.message);
        try {
          const centralDb = await getCentralDb();
          const school = await centralDb.collection('schools').findOne(
            { code: tenant },
            { projection: { _id: 0, id: 1, code: 1, db_name: 1 } }
          );
          if (school) {
            req.schoolCode = school.code;
            req.schoolDb = getSchoolDbByName(school.db_name);
            req.schoolSubdomain = tenant;
            req.schoolId = school.id;
            console.log(`[TENANT] School resolved by code from X-Tenant: Code=${school.code}, ID=${school.id}, DB=${school.db_name}`);
            return next();
          }
        } catch (codeErr) {
          console.error(`[TENANT] Failed to resolve school from X-Tenant header: ${tenant}`, codeErr.message);
        }
      }
    }

    // ✅ PRIORITY 2: Check Host header (for direct browser access)
    const hostHeader = req.headers.host || req.hostname || '';
    const host = hostHeader.split(':')[0].toLowerCase(); // strip port

    // --------------------------------------------
    // ✅ 1. Handle localhost subdomains (e.g., dps.localhost)
    // --------------------------------------------
    // Check if it's a localhost subdomain (e.g., dps.localhost)
    if (host.endsWith('.localhost')) {
      const parts = host.split('.');
      if (parts.length >= 2 && parts[0] !== 'localhost') {
        const subdomain = parts[0].toLowerCase();
        console.log(`[TENANT] Detected localhost subdomain: ${subdomain} from host: ${host}`);
        try {
          const { db: schoolDb, schoolCode, schoolId } = await getSchoolDbBySubdomain(subdomain);
          req.schoolCode = schoolCode;
          req.schoolDb = schoolDb;
          req.schoolSubdomain = subdomain;
          req.schoolId = schoolId;
          console.log(`[TENANT] School resolved: Code=${schoolCode}, ID=${schoolId}, DB=${schoolDb.databaseName}`);
          return next();
        } catch (err) {
          console.warn(`[TENANT] Subdomain lookup failed for "${subdomain}", trying code lookup...`, err.message);
          try {
            const centralDb = await getCentralDb();
            const school = await centralDb.collection('schools').findOne(
              { code: subdomain },
              { projection: { _id: 0, id: 1, code: 1, db_name: 1 } }
            );
            if (school) {
              req.schoolCode = school.code;
              req.schoolDb = getSchoolDbByName(school.db_name);
              req.schoolSubdomain = subdomain;
              req.schoolId = school.id;
              console.log(`[TENANT] School resolved by code: Code=${school.code}, ID=${school.id}, DB=${school.db_name}`);
              return next();
            }
            throw new Error('School not found');
          } catch (codeErr) {
            console.error(`[TENANT] Failed to resolve school for subdomain: ${subdomain}`, codeErr.message);
            return res.status(404).json({
              error: "Invalid school subdomain or school not found",
            });
          }
        }
      }
    }

    // --------------------------------------------
    // ✅ 2. SKIP tenant resolver for exact localhost (no subdomain)
    // --------------------------------------------
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      /^[0-9.]+$/.test(host) // IP address
    ) {
      req.schoolCode = null;
      req.schoolDb = null; // use central routes only
      return next();
    }

    // --------------------------------------------
    // ✅ 3. Handle SUBDOMAIN (e.g., dps.example.com)
    // Extract subdomain from hostname
    // Example: dps.example.com → "dps"
    // --------------------------------------------
    const parts = host.split('.');
    let subdomain = null;
    
    // If we have 3+ parts, it's a subdomain (e.g., dps.example.com)
    if (parts.length >= 3) {
      subdomain = parts[0].toLowerCase(); // Get subdomain part
    } 
    // If we have 2 parts, it could be a direct domain (e.g., dps.com)
    // For now, treat it as the subdomain
    else if (parts.length === 2) {
      subdomain = parts[0].toLowerCase();
    }

    // --------------------------------------------
    // ✅ CUSTOM DOMAIN SUPPORT (COMMENTED FOR FUTURE USE)
    // --------------------------------------------
    // To enable custom domain support:
    // 1. Uncomment the code below
    // 2. Update schools collection to include custom_domain field
    // 3. Test with custom domains
    //
    // if (!subdomain) {
    //   // Try to find by custom domain
    //   const centralDb = await getCentralDb();
    //   const school = await centralDb.collection('schools').findOne({
    //     custom_domain: host, // Match exact custom domain
    //   });
    //
    //   if (school) {
    //     req.schoolCode = school.code;
    //     req.schoolDb = getSchoolDbByName(school.db_name);
    //     return next();
    //   }
    // }
    // --------------------------------------------

    if (!subdomain) {
      req.schoolCode = null;
      req.schoolDb = null;
      return next();
    }

    // Get school database by subdomain (this also returns the school code)
    // This is more accurate because we match by subdomain field in DB
    try {
      const { db: schoolDb, schoolCode, schoolId } = await getSchoolDbBySubdomain(subdomain);
      req.schoolCode = schoolCode;
      req.schoolDb = schoolDb;
      req.schoolSubdomain = subdomain;
      req.schoolId = schoolId;
    } catch (err) {
      // If subdomain lookup fails, try by code as fallback
      console.warn(`Subdomain lookup failed for "${subdomain}", trying code lookup...`);
      const centralDb = await getCentralDb();
      const school = await centralDb.collection('schools').findOne(
        { code: subdomain },
        { projection: { _id: 0, id: 1, code: 1, db_name: 1 } }
      );
      if (school) {
        req.schoolCode = school.code;
        req.schoolDb = getSchoolDbByName(school.db_name);
        req.schoolSubdomain = subdomain;
        req.schoolId = school.id;
      } else {
        throw err;
      }
    }

    return next();
  } catch (err) {
    console.error("Tenant Resolver Error:", err.message);
    return res.status(404).json({
      error: "Invalid school domain or school not found",
    });
  }
};
