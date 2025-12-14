# Testing Subdomains on Localhost

## Overview
To test subdomain functionality on `localhost:3000`, you need to configure your system to recognize subdomains like `dps.localhost:3000`.

## Method 1: Using .localhost Domain (Recommended - Easiest)

Modern browsers automatically resolve `*.localhost` subdomains to `127.0.0.1`. This is the easiest method!

### Steps:

1. **Start your frontend server**:
   ```bash
   cd frontend
   npm start
   ```
   This usually runs on `http://localhost:3000`

2. **Access subdomain directly**:
   - Main domain: `http://localhost:3000`
   - School subdomain: `http://dps.localhost:3000`
   - Another school: `http://school1.localhost:3000`

3. **That's it!** No configuration needed - browsers handle `*.localhost` automatically.

### Note:
- Make sure your React app is configured to accept these domains
- The tenant detection code will automatically extract `dps` from `dps.localhost:3000`

## Method 2: Using /etc/hosts File (Alternative)

If `*.localhost` doesn't work, you can manually configure subdomains:

### For Mac/Linux:

1. **Edit hosts file**:
   ```bash
   sudo nano /etc/hosts
   ```

2. **Add these lines**:
   ```
   127.0.0.1  localhost
   127.0.0.1  dps.localhost
   127.0.0.1  school1.localhost
   127.0.0.1  ajaytech.localhost
   ```

3. **Save and exit** (Ctrl+X, then Y, then Enter)

4. **Access subdomains**:
   - Main: `http://localhost:3000`
   - School: `http://dps.localhost:3000`

### For Windows:

1. **Open Notepad as Administrator**:
   - Right-click Notepad → "Run as administrator"

2. **Open hosts file**:
   - File → Open
   - Navigate to: `C:\Windows\System32\drivers\etc\hosts`
   - Change file type to "All Files"

3. **Add these lines**:
   ```
   127.0.0.1  localhost
   127.0.0.1  dps.localhost
   127.0.0.1  school1.localhost
   127.0.0.1  ajaytech.localhost
   ```

4. **Save the file**

5. **Flush DNS cache** (in Command Prompt as Admin):
   ```cmd
   ipconfig /flushdns
   ```

6. **Access subdomains**:
   - Main: `http://localhost:3000`
   - School: `http://dps.localhost:3000`

## Method 3: Using Custom Port Configuration

If you need to test with a specific port setup:

1. **Update tenant detection** (already handles localhost):
   - The code already treats `localhost` as main domain (no tenant)
   - Subdomains like `dps.localhost` will be detected as subdomain

2. **Start frontend**:
   ```bash
   cd frontend
   PORT=3000 npm start
   ```

3. **Access**:
   - `http://localhost:3000` → Landing page
   - `http://dps.localhost:3000` → Login page

## Testing Checklist

### Test 1: Main Domain
1. Visit: `http://localhost:3000`
2. Expected: Landing page with marketing content
3. Should NOT show login form directly

### Test 2: School Subdomain
1. Visit: `http://dps.localhost:3000`
2. Expected: Login page directly (not Landing page)
3. Should show "School Login" or similar heading

### Test 3: Login Flow
1. Visit: `http://dps.localhost:3000`
2. Enter school credentials
3. Expected: Login successful → Redirect to `/dashboard`
4. Check browser console: Should see `X-Tenant: dps` in API requests

### Test 4: Backend Verification
1. Check backend logs when accessing subdomain
2. Expected: Backend should receive `Host: dps.localhost:3000` header
3. Backend should extract subdomain: `dps`
4. Backend should look up school with `subdomain: "dps"`

## Debugging

### Check Subdomain Detection

Open browser console on `http://dps.localhost:3000` and run:

```javascript
// Check hostname
console.log(window.location.hostname); // Should be "dps.localhost"

// Check tenant detection
// This should return "dps"
```

### Verify Backend Receives Subdomain

Check backend logs when making API request:
- Look for `Host` header in request
- Should see: `Host: dps.localhost:3000`
- Backend should extract: `dps`

### Common Issues

#### Issue: Subdomain shows Landing page instead of Login
**Solution:**
- Check browser console for errors
- Verify you're accessing `dps.localhost:3000` (not `localhost:3000`)
- Clear browser cache
- Check tenant detection: `console.log(getTenantFromDomain())`

#### Issue: CORS errors
**Solution:**
- Update backend CORS to allow `localhost` and `*.localhost`
- Backend should have:
  ```javascript
  origin: function (origin, callback) {
    if (!origin || origin.includes('localhost')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  }
  ```

#### Issue: "School not found" error
**Solution:**
- Verify school record in MongoDB:
  ```javascript
  {
    "code": "dps",
    "subdomain": "dps",
    "db_name": "school_dps_db"
  }
  ```
- Check backend logs for tenant resolution
- Verify backend is running and connected to MongoDB

## Quick Test Script

Create a test file to verify subdomain detection:

```javascript
// test-subdomain.js
const { getTenantFromDomain, isSubdomain } = require('./src/utils/tenant');

// Simulate different hostnames
const testCases = [
  'localhost',
  'dps.localhost',
  'school1.localhost',
  'ajaytech.netlify.app',
  'dps.ajaytech.netlify.app'
];

testCases.forEach(hostname => {
  // Mock window.location.hostname
  global.window = { location: { hostname } };
  
  console.log(`Hostname: ${hostname}`);
  console.log(`  Is Subdomain: ${isSubdomain()}`);
  console.log(`  Tenant: ${getTenantFromDomain()}`);
  console.log('');
});
```

## Environment Setup

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=central_db
PORT=8001
CORS_ORIGINS=http://localhost:3000,http://*.localhost:3000
```

## Example Test Flow

1. **Start Backend**:
   ```bash
   cd backend
   npm start
   # Backend runs on http://localhost:8001
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm start
   # Frontend runs on http://localhost:3000
   ```

3. **Test Main Domain**:
   - Open: `http://localhost:3000`
   - Should see: Landing page

4. **Test School Subdomain**:
   - Open: `http://dps.localhost:3000`
   - Should see: Login page
   - Login with school credentials
   - Should redirect to dashboard

5. **Verify API Calls**:
   - Open browser DevTools → Network tab
   - Check API requests
   - Should see header: `X-Tenant: dps`

## Summary

**Easiest Method**: Just use `http://dps.localhost:3000` - modern browsers handle this automatically!

**Alternative**: Edit `/etc/hosts` (Mac/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows) to add subdomain mappings.

Both methods will allow you to test subdomain functionality locally before deploying to Netlify.

