# Subdomain Setup Guide for Multi-Tenant School Management System

## Overview
This system supports multi-tenant access using subdomains. Each school can be accessed via its subdomain (e.g., `dps.example.com`).

## School Configuration

Based on your school data:
```json
{
  "id": "d8b845a5-680c-4be1-93f4-1fdebf54e1f2",
  "name": "Delhi public School",
  "code": "dps",
  "subdomain": "dps",
  "custom_domain": "dps.in",
  "db_name": "school_dps_db"
}
```

## How Subdomain Access Works

### 1. **Subdomain Format**
- **Subdomain**: `dps` (from your school record)
- **Full URL**: `dps.example.com` (where `example.com` is your main domain)
- The system extracts `dps` from the subdomain and looks up the school

### 2. **Access Flow**

#### Frontend (React)
1. User visits `dps.example.com`
2. System detects subdomain using `isSubdomain()` function
3. Shows **Login page directly** (bypasses Landing page)
4. User logs in with their credentials
5. System automatically includes `X-Tenant: dps` header in API requests

#### Backend (Node.js/Express)
1. Request comes in with `Host: dps.example.com`
2. `tenantResolver` middleware extracts subdomain: `dps`
3. Looks up school in `central_db.schools` collection:
   ```javascript
   { subdomain: "dps" }
   ```
4. Finds school record and gets `db_name: "school_dps_db"`
5. Attaches school database to `req.schoolDb`
6. All subsequent queries use the school's database

## Setup Instructions

### Step 1: DNS Configuration

You need to configure DNS to point subdomains to your server:

#### Option A: Wildcard DNS (Recommended)
```
*.example.com  A  <your-server-ip>
```

This allows any subdomain (dps.example.com, school1.example.com, etc.) to point to your server.

#### Option B: Individual Subdomain Records
```
dps.example.com  A  <your-server-ip>
```

### Step 2: Server Configuration

#### For Development (Local)
You can use `/etc/hosts` file to test locally:
```
127.0.0.1  dps.localhost
127.0.0.1  school1.localhost
```

Then access: `http://dps.localhost:3000`

#### For Production
Configure your web server (Nginx/Apache) to:
1. Accept requests for `*.example.com`
2. Proxy to your Node.js backend
3. Forward the `Host` header correctly

**Example Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name *.example.com example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Step 3: Environment Variables

Make sure your `.env` file has:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=central_db
PORT=3000
REACT_APP_BACKEND_URL=http://localhost:3000
```

### Step 4: Database Setup

Ensure your MongoDB has:
1. **Central Database** (`central_db`):
   - Collection: `schools`
   - Contains school records with `subdomain` field

2. **School Database** (`school_dps_db`):
   - Contains all school-specific data (students, teachers, classes, etc.)

## Testing Subdomain Access

### Test 1: Subdomain Detection
1. Visit `dps.example.com` (or `dps.localhost` in dev)
2. Should see **Login page** (not Landing page)
3. Check browser console for tenant detection

### Test 2: Login Flow
1. Visit `dps.example.com`
2. Login with school admin credentials
3. Should redirect to `/dashboard`
4. All API calls should include `X-Tenant: dps` header

### Test 3: Backend Verification
Check backend logs when accessing subdomain:
```
Tenant Resolver: Extracted subdomain "dps"
School found: Delhi public School
Using database: school_dps_db
```

## Troubleshooting

### Issue: "School not found"
**Solution**: 
- Verify school record in `central_db.schools` has `subdomain: "dps"`
- Check that subdomain matches exactly (case-insensitive)

### Issue: Wrong database being used
**Solution**:
- Verify `db_name` field in school record matches actual database name
- Check MongoDB connection and database exists

### Issue: Landing page shows instead of Login
**Solution**:
- Verify DNS/hosts file configuration
- Check browser is accessing correct subdomain
- Clear browser cache

### Issue: API requests failing
**Solution**:
- Check `X-Tenant` header is being sent (check Network tab)
- Verify backend `tenantResolver` middleware is working
- Check CORS configuration allows subdomain origins

## Custom Domain Support (Future)

Your school also has `custom_domain: "dps.in"` configured. To enable custom domain support:

1. **Uncomment custom domain code** in:
   - `frontend/src/utils/tenant.js`
   - `backend/middleware/tenantResolver.js`
   - `backend/middleware/tenantMiddleware.js`

2. **Configure DNS**:
   ```
   dps.in  A  <your-server-ip>
   ```

3. **Update backend lookup** to check both subdomain and custom_domain

## Current Implementation Status

✅ **Subdomain Support**: Fully functional
- Frontend detects subdomain and shows Login page
- Backend resolves subdomain to school database
- API requests include tenant header

⏸️ **Custom Domain Support**: Commented (ready to enable)
- Code is prepared but commented out
- Can be enabled by uncommenting marked sections

## Example URLs

For your school "Delhi public School" (code: dps):

- **Subdomain**: `http://dps.example.com` → Login page → Dashboard
- **Main Domain**: `http://example.com` → Landing page
- **Custom Domain** (when enabled): `http://dps.in` → Login page → Dashboard

## Next Steps

1. ✅ Configure DNS for subdomain access
2. ✅ Test subdomain login flow
3. ✅ Verify school database isolation
4. ⏸️ Enable custom domain support (optional)

