# Testing OCR Endpoint - Check if Backend is Disabled

## 🔍 How to Check if Backend OCR Endpoint is Disabled

### Method 1: Check Network Tab in Browser DevTools

1. **Open Browser DevTools** (F12)
2. **Go to Network Tab**
3. **Capture an EID image** in Step 2
4. **Look for the request** to `/api/ocr`
5. **Check the Response** - You should see the error message from backend

### Method 2: Test Endpoint Directly in Console

Run this in the browser console to test the OCR endpoint:

```javascript
// Test OCR endpoint
async function testOCREndpoint() {
  // Create a dummy base64 image (1x1 pixel)
  const dummyImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==';
  
  const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/ocr`;
  
  console.log('Testing OCR endpoint:', apiUrl);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: dummyImage,
        firstName: 'Test',
        lastName: 'User'
      })
    });
    
    console.log('Response Status:', response.status, response.statusText);
    
    const result = await response.json();
    console.log('Response Body:', result);
    
    if (result.error) {
      console.error('❌ Backend Error:', result.error);
    }
    
    if (result.message) {
      console.log('📝 Backend Message:', result.message);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Request Failed:', error);
    return { error: error.message };
  }
}

// Run the test
testOCREndpoint();
```

### Method 3: Check Backend Response in Network Tab

```javascript
// Intercept fetch requests to see backend responses
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  if (typeof url === 'string' && url.includes('/api/ocr')) {
    console.log('🔍 OCR Request:', url);
    return originalFetch.apply(this, args).then(response => {
      response.clone().json().then(data => {
        console.log('📥 OCR Response:', data);
        if (data.error || data.message) {
          console.log('💬 Backend Message:', data.error || data.message);
        }
      }).catch(() => {});
      return response;
    });
  }
  return originalFetch.apply(this, args);
};

// Now capture an EID image and check console
```

### Method 4: Check Current API Configuration

```javascript
// Check what API URL is being used
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');
console.log('Full OCR URL:', `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/ocr`);

// Check if endpoint exists
fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/ocr`, {
  method: 'OPTIONS'
}).then(r => {
  console.log('Endpoint exists:', r.status !== 404);
  console.log('Status:', r.status);
}).catch(e => {
  console.error('Endpoint check failed:', e);
});
```

## 🔍 What to Look For

### If Backend is Disabled, You'll See:

1. **Response Status:** `404`, `403`, `503`, or `500`
2. **Response Body:**
   ```json
   {
     "error": "OCR endpoint is disabled. EID verification has been removed",
     "success": false
   }
   ```
   OR
   ```json
   {
     "message": "OCR endpoint is disabled. EID verification has been removed",
     "success": false
   }
   ```

### If Backend is Working, You'll See:

1. **Response Status:** `200`
2. **Response Body:**
   ```json
   {
     "success": true,
     "isEmiratesID": true,
     "side": "front",
     ...
   }
   ```

## 📋 Frontend Code Location

The frontend calls the backend OCR endpoint here:

**File:** `src/services/ocrService.ts`  
**Function:** `validateEmiratesIDWithBackend()`  
**Endpoint:** `POST {API_BASE_URL}/api/ocr`

**Called from:** `src/components/Step2EmiratesIDScan.tsx`  
**When:** Immediately after EID image is captured

## 🛠️ How to Fix

### If Backend Disabled the Endpoint:

1. **Check Backend Status:**
   - Is the backend server running?
   - Is the `/api/ocr` route disabled/removed?
   - Check backend logs for errors

2. **Check Backend Code:**
   - Look for `/api/ocr` route in backend
   - Check if it's commented out or removed
   - Check if there's a feature flag disabling it

3. **Temporary Frontend Workaround:**
   - The frontend has simulation mode
   - Set `VITE_ENABLE_SIMULATION_MODE=true` in `.env`
   - This will skip OCR validation (for testing only)

### If You Need to Re-enable:

1. **Backend:** Re-enable the `/api/ocr` endpoint
2. **Backend:** Ensure OCR service is configured
3. **Backend:** Check API keys are set correctly
4. **Frontend:** No changes needed - it will automatically work

## 🧪 Quick Test Script

Copy and paste this into browser console:

```javascript
(async () => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const url = `${baseUrl}/api/ocr`;
  
  console.log('🔍 Testing OCR Endpoint...');
  console.log('URL:', url);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        firstName: 'Test',
        lastName: 'User'
      })
    });
    
    const data = await response.json();
    
    console.log('✅ Status:', response.status);
    console.log('📦 Response:', data);
    
    if (data.error) {
      console.error('❌ Error:', data.error);
    }
    
    if (data.message) {
      console.log('💬 Message:', data.message);
    }
    
    if (data.success === false) {
      console.warn('⚠️ Endpoint may be disabled');
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
})();
```










