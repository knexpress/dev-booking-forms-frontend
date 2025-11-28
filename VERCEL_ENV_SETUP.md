# Vercel Environment Variables Setup

## ⚠️ IMPORTANT: Set Environment Variable in Vercel

To fix the 404 error for `/api/bookings`, you **MUST** set the environment variable in Vercel.

## Steps to Fix:

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project: `Booking-Forms-Frontend`

2. **Navigate to Settings**
   - Click on your project
   - Go to **Settings** → **Environment Variables**

3. **Add Environment Variable**
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://booking-forms-backend.onrender.com`
   - **Environment:** Select **Production**, **Preview**, and **Development** (or at least **Production**)

4. **Redeploy**
   - After adding the environment variable, you need to **redeploy** your application
   - Go to **Deployments** tab
   - Click the **⋯** (three dots) on the latest deployment
   - Click **Redeploy**
   - Or push a new commit to trigger a new deployment

## Verify It's Working:

After redeploying, check the browser console when submitting a booking:
- You should see: `🌐 API Base URL: https://booking-forms-backend.onrender.com`
- You should see: `📡 Calling API: https://booking-forms-backend.onrender.com/api/bookings`

If you still see `http://localhost:5000`, the environment variable is not set correctly.

## Troubleshooting:

- **Still getting 404?** Make sure you redeployed after adding the environment variable
- **Environment variable not showing?** Make sure you selected the correct environment (Production)
- **Build failing?** Check that the variable name is exactly `VITE_API_BASE_URL` (case-sensitive)
- **Getting "Failed to submit booking" error?** 
  - Check browser console for the actual API URL being used
  - Verify the backend server is running and accessible
  - Make sure CORS is enabled on the backend to allow your Vercel domain
  - Check that the backend URL in `VITE_API_BASE_URL` is correct (should be HTTPS, not HTTP)

## Common Error Messages:

1. **"API configuration error: VITE_API_BASE_URL environment variable is not set"**
   - Solution: Add `VITE_API_BASE_URL` in Vercel Dashboard → Settings → Environment Variables
   - Then redeploy

2. **"Cannot connect to backend API"**
   - Check if backend server is running
   - Verify the URL in `VITE_API_BASE_URL` is correct
   - Check CORS settings on backend

3. **"API endpoint not found (404)"**
   - Verify the backend URL is correct
   - Check that `/api/bookings` endpoint exists on your backend
   - Make sure you redeployed after setting the environment variable

