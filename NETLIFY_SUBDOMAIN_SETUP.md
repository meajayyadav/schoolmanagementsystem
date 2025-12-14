# Netlify Subdomain Setup Guide

## Overview
Your school management system is hosted on Netlify at `ajaytech.netlify.app`. This guide explains how to enable subdomain access for schools (e.g., `dps.ajaytech.netlify.app`).

## Current Setup
- **Main Domain**: `ajaytech.netlify.app`
- **School Subdomain Example**: `dps.ajaytech.netlify.app` (for Delhi public School)

## Step 1: Enable Wildcard Subdomains in Netlify

### Option A: Netlify Dashboard (Recommended)

1. **Go to Netlify Dashboard**
   - Visit: https://app.netlify.com
   - Select your site: `ajaytech`

2. **Domain Settings**
   - Go to: **Site settings** → **Domain management**
   - Click: **Add custom domain** or **Options** on existing domain

3. **Enable Wildcard Subdomains**
   - Netlify automatically supports wildcard subdomains for `*.netlify.app`
   - No additional configuration needed for `*.netlify.app` subdomains
   - Any subdomain like `dps.ajaytech.netlify.app` will automatically work!

### Option B: Using Custom Domain (Optional)

If you want to use a custom domain (e.g., `ajaytech.com`):

1. **Add Custom Domain in Netlify**
   - Site settings → Domain management → Add custom domain
   - Add: `ajaytech.com`

2. **Configure DNS**
   - Add A record: `ajaytech.com` → Netlify IP
   - Add CNAME record: `*.ajaytech.com` → `ajaytech.netlify.app`

3. **Enable Wildcard**
   - Netlify will automatically handle `*.ajaytech.com` subdomains

## Step 2: Configure Environment Variables

### In Netlify Dashboard:

1. Go to: **Site settings** → **Environment variables**
2. Add/Update:
   ```
   REACT_APP_BACKEND_URL = https://your-backend-url.com
   ```
   Replace with your actual backend URL (e.g., Render, Railway, Heroku, etc.)

### Important Notes:
- Backend must be accessible from the internet
- Backend must handle CORS for subdomain origins
- Backend must support the `X-Tenant` header

## Step 3: Backend CORS Configuration

Your backend needs to accept requests from subdomains. Update your backend CORS:

```javascript
// backend/app.js
const origins = [
  'https://ajaytech.netlify.app',
  'https://*.ajaytech.netlify.app', // Wildcard for subdomains
  'http://localhost:3000' // For local dev
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests from main domain and all subdomains
    if (!origin || 
        origins.some(allowed => {
          if (allowed.includes('*')) {
            const pattern = allowed.replace('*', '[^.]+');
            return new RegExp(`^https://${pattern}\\.ajaytech\\.netlify\\.app$`).test(origin);
          }
          return origin === allowed;
        })) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant'],
}));
```

Or simpler approach (less secure but works):

```javascript
app.use(cors({
  origin: function (origin, callback) {
    // Allow all Netlify subdomains
    if (!origin || origin.includes('netlify.app') || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

## Step 4: Test Subdomain Access

### Test URLs:

1. **Main Domain** (Landing Page):
   ```
   https://ajaytech.netlify.app
   ```
   Should show: Landing page with marketing content

2. **School Subdomain** (Login Page):
   ```
   https://dps.ajaytech.netlify.app
   ```
   Should show: Login page directly (not Landing page)

3. **Another School**:
   ```
   https://school1.ajaytech.netlify.app
   ```
   Should show: Login page

### Verification Checklist:

- [ ] Main domain shows Landing page
- [ ] Subdomain shows Login page
- [ ] Login works on subdomain
- [ ] After login, redirects to dashboard
- [ ] API calls include `X-Tenant` header
- [ ] Backend receives correct tenant information

## Step 5: Database Configuration

Ensure your MongoDB has the school record:

```javascript
{
  "code": "dps",
  "subdomain": "dps",
  "name": "Delhi public School",
  "db_name": "school_dps_db"
}
```

The backend will:
1. Extract `dps` from `dps.ajaytech.netlify.app`
2. Look up school with `subdomain: "dps"`
3. Use database `school_dps_db` for all queries

## How It Works

### Frontend Flow:
```
User visits: dps.ajaytech.netlify.app
    ↓
Frontend detects: subdomain = "dps"
    ↓
Shows: Login page (not Landing)
    ↓
User logs in
    ↓
API calls include: X-Tenant: dps header
    ↓
Backend receives tenant info
```

### Backend Flow:
```
Request arrives: Host: dps.ajaytech.netlify.app
    ↓
tenantResolver extracts: subdomain = "dps"
    ↓
Database lookup: { subdomain: "dps" }
    ↓
Finds school → Uses db_name: "school_dps_db"
    ↓
All queries use school's database
```

## Troubleshooting

### Issue: Subdomain shows Landing page instead of Login
**Solution:**
- Check browser console for errors
- Verify subdomain detection: `console.log(getTenantFromDomain())`
- Clear browser cache
- Check Netlify deployment is latest

### Issue: CORS errors in browser console
**Solution:**
- Update backend CORS to allow `*.netlify.app` origins
- Check backend is accessible from internet
- Verify `credentials: true` in CORS config

### Issue: "School not found" error
**Solution:**
- Verify school record in `central_db.schools` collection
- Check `subdomain` field matches exactly (case-insensitive)
- Check backend logs for tenant resolution errors

### Issue: API calls failing
**Solution:**
- Check `REACT_APP_BACKEND_URL` environment variable in Netlify
- Verify backend is running and accessible
- Check Network tab in browser DevTools for request details

### Issue: Subdomain not resolving
**Solution:**
- Netlify automatically supports `*.netlify.app` subdomains
- No DNS configuration needed for `*.netlify.app`
- If using custom domain, configure DNS wildcard record

## Environment Variables Summary

### Netlify Environment Variables:
```
REACT_APP_BACKEND_URL=https://your-backend-url.com
```

### Backend Environment Variables:
```
MONGO_URL=mongodb://your-mongo-url
DB_NAME=central_db
PORT=3000
CORS_ORIGINS=https://ajaytech.netlify.app,https://*.ajaytech.netlify.app
```

## Example School URLs

For your school "Delhi public School" (code: dps):

- **Main Domain**: `https://ajaytech.netlify.app` → Landing page
- **School Subdomain**: `https://dps.ajaytech.netlify.app` → Login page
- **After Login**: `https://dps.ajaytech.netlify.app/dashboard` → Dashboard

## Next Steps

1. ✅ Deploy frontend to Netlify (already done)
2. ✅ Configure `REACT_APP_BACKEND_URL` in Netlify
3. ✅ Update backend CORS for subdomain support
4. ✅ Test subdomain access
5. ✅ Verify login flow works
6. ✅ Test with multiple schools

## Additional Resources

- [Netlify Subdomain Documentation](https://docs.netlify.com/domains-https/custom-domains/subdomains/)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [CORS Configuration Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

