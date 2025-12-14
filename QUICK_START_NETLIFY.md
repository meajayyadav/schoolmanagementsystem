# Quick Start: Enable Subdomain Login on Netlify

## Your Current Setup
- **Frontend**: `ajaytech.netlify.app` (Netlify)
- **Backend**: Your backend URL (configure in environment variables)
- **School Example**: Delhi public School (code: `dps`, subdomain: `dps`)

## Quick Setup Steps

### 1. Configure Netlify Environment Variable

In Netlify Dashboard:
1. Go to: **Site settings** → **Environment variables**
2. Add/Update:
   ```
   REACT_APP_BACKEND_URL = https://your-backend-url.com
   ```
   Replace with your actual backend URL

### 2. Update Backend CORS (Already Done ✅)

The backend code has been updated to automatically allow:
- All `*.netlify.app` subdomains
- Any origins specified in `CORS_ORIGINS` environment variable

**Backend Environment Variable** (optional, for more control):
```
CORS_ORIGINS=https://ajaytech.netlify.app,https://*.ajaytech.netlify.app
```

Or leave it as `*` to allow all origins (less secure but simpler).

### 3. Deploy and Test

1. **Deploy frontend to Netlify** (if not already deployed)
2. **Test main domain**: `https://ajaytech.netlify.app`
   - Should show: Landing page
3. **Test school subdomain**: `https://dps.ajaytech.netlify.app`
   - Should show: Login page directly
   - Login with school credentials
   - Should redirect to dashboard

## How It Works

### For Your School (Delhi public School):

1. **School Data**:
   ```json
   {
     "code": "dps",
     "subdomain": "dps",
     "name": "Delhi public School",
     "db_name": "school_dps_db"
   }
   ```

2. **Access URL**: `https://dps.ajaytech.netlify.app`

3. **What Happens**:
   - Frontend detects subdomain: `dps`
   - Shows Login page (not Landing)
   - User logs in
   - API calls include header: `X-Tenant: dps`
   - Backend looks up school by `subdomain: "dps"`
   - Uses database: `school_dps_db`

## Testing Checklist

- [ ] Main domain (`ajaytech.netlify.app`) shows Landing page
- [ ] Subdomain (`dps.ajaytech.netlify.app`) shows Login page
- [ ] Login works on subdomain
- [ ] After login, redirects to dashboard
- [ ] No CORS errors in browser console
- [ ] API calls succeed

## Troubleshooting

### CORS Errors
- Check backend is running
- Verify `REACT_APP_BACKEND_URL` in Netlify
- Check backend logs for CORS issues

### Subdomain Shows Landing Page
- Clear browser cache
- Check browser console for errors
- Verify latest deployment on Netlify

### "School not found" Error
- Verify school record in MongoDB `central_db.schools`
- Check `subdomain` field matches: `"dps"`
- Check backend logs for tenant resolution

## Example URLs

- **Main**: `https://ajaytech.netlify.app` → Landing
- **School**: `https://dps.ajaytech.netlify.app` → Login
- **Dashboard**: `https://dps.ajaytech.netlify.app/dashboard` → Dashboard (after login)

## That's It! 🎉

Netlify automatically supports `*.netlify.app` subdomains, so no DNS configuration is needed. Just:
1. Set the backend URL in Netlify environment variables
2. Deploy
3. Test with `dps.ajaytech.netlify.app`

For more details, see `NETLIFY_SUBDOMAIN_SETUP.md`

