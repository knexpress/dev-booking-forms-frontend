# Security Console Commands - Vulnerability Testing

## ⚠️ Security Warning
These commands help you identify what data attackers can access through the browser console. Use these to test your application's security posture.

## Console Commands to Test

### 1. Check for Exposed Global Variables
```javascript
// Check all global variables
Object.keys(window).filter(key => typeof window[key] === 'object' && window[key] !== null)

// Check for exposed state
window.__REACT_DEVTOOLS_GLOBAL_HOOK__
window.__REDUX_DEVTOOLS_EXTENSION__

// Check for exposed app state
window.app
window.state
window.store
```

### 2. Check LocalStorage/SessionStorage for Sensitive Data
```javascript
// Check localStorage
Object.keys(localStorage).forEach(key => {
  console.log(key, localStorage.getItem(key));
});

// Check sessionStorage
Object.keys(sessionStorage).forEach(key => {
  console.log(key, sessionStorage.getItem(key));
});

// Search for sensitive patterns
Object.keys(localStorage).filter(key => 
  /token|password|secret|key|auth|credential/i.test(key)
);
```

### 3. Check for Exposed API Keys/Secrets
```javascript
// Search for API keys in window object
JSON.stringify(window, null, 2).match(/api[_-]?key|secret|token/gi)

// Check for configuration objects
window.config
window.API_CONFIG
window.env
window.process?.env
```

### 4. Access React Component State (if DevTools available)
```javascript
// If React DevTools are installed
$r?.props
$r?.state
$r?.context

// Access React Fiber (internal)
document.querySelector('[data-reactroot]')?._reactInternalInstance
```

### 5. Check Network Requests/Interceptors
```javascript
// Intercept fetch requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('Fetch intercepted:', args);
  return originalFetch.apply(this, args);
};

// Intercept XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(...args) {
  console.log('XHR intercepted:', args);
  return originalXHROpen.apply(this, args);
};
```

### 6. Check for Exposed Form Data
```javascript
// Get all form inputs
Array.from(document.querySelectorAll('input, textarea, select')).forEach(el => {
  if (el.value) console.log(el.name || el.id, el.value);
});

// Check for hidden inputs with sensitive data
Array.from(document.querySelectorAll('input[type="hidden"]')).forEach(el => {
  console.log(el.name, el.value);
});
```

### 7. Check Cookies
```javascript
// List all cookies
document.cookie.split(';').forEach(cookie => console.log(cookie.trim()));

// Check for authentication cookies
document.cookie.match(/auth|token|session|jwt/gi);
```

### 8. Check for Exposed Environment Variables
```javascript
// Check import.meta.env (Vite)
import.meta.env

// Check process.env (if exposed)
process?.env

// Check for build-time variables
window.__ENV__
```

### 9. Access Application State/Store
```javascript
// Check for Redux store
window.__REDUX_STORE__
window.store

// Check for React Context
// (Requires React DevTools or manual inspection)
```

### 10. Check for Sensitive Data in DOM
```javascript
// Search for API keys in page source
document.documentElement.innerHTML.match(/api[_-]?key[=:]\s*['"]([^'"]+)['"]/gi);

// Check for tokens in data attributes
Array.from(document.querySelectorAll('[data-token], [data-key], [data-secret]')).forEach(el => {
  console.log(el, el.dataset);
});
```

### 11. Check for Exposed Source Maps
```javascript
// Check if source maps are exposed (security risk)
fetch('/src/main.tsx.map').then(r => r.ok ? console.warn('⚠️ Source maps exposed!') : null);
```

### 12. Check Memory/Performance API for Sensitive Data
```javascript
// Check performance entries for sensitive URLs
performance.getEntriesByType('resource').forEach(entry => {
  if (/api|auth|token|secret/.test(entry.name)) {
    console.log('Sensitive resource:', entry.name);
  }
});
```

## 🛡️ Security Recommendations

### 1. **Never Store Sensitive Data in:**
- ❌ localStorage/sessionStorage (for sensitive data)
- ❌ Global window variables
- ❌ React component state (for secrets)
- ❌ DOM data attributes
- ❌ Inline JavaScript
- ❌ Source code comments

### 2. **Use Secure Storage:**
- ✅ HTTP-only cookies for tokens
- ✅ Secure, SameSite cookies
- ✅ Server-side session storage
- ✅ Encrypted storage for client-side data

### 3. **Protect API Keys:**
- ✅ Use environment variables (not exposed to client)
- ✅ Use backend proxy for API calls
- ✅ Implement API key rotation
- ✅ Use short-lived tokens

### 4. **Minimize Data Exposure:**
- ✅ Remove source maps in production
- ✅ Minify/obfuscate code
- ✅ Use Content Security Policy (CSP)
- ✅ Implement proper CORS policies

### 5. **Monitor and Log:**
- ✅ Log suspicious console access attempts
- ✅ Monitor for unusual API calls
- ✅ Implement rate limiting
- ✅ Use security headers

## 🔍 Quick Security Audit Script

Run this in the browser console to get a security report:

```javascript
(function() {
  const report = {
    localStorage: Object.keys(localStorage).length,
    sessionStorage: Object.keys(sessionStorage).length,
    cookies: document.cookie.split(';').length,
    exposedGlobals: Object.keys(window).filter(k => 
      /api|key|secret|token|auth|password|credential/i.test(k)
    ),
    sensitiveCookies: document.cookie.match(/auth|token|session|jwt/gi) || [],
    sourceMaps: null
  };
  
  // Check for source maps
  fetch('/src/main.tsx.map').then(r => {
    report.sourceMaps = r.ok;
    console.table(report);
  }).catch(() => {
    report.sourceMaps = false;
    console.table(report);
  });
})();
```

## 📋 Testing Checklist

- [ ] No API keys in localStorage/sessionStorage
- [ ] No sensitive data in global window variables
- [ ] No tokens in cookies (use HTTP-only instead)
- [ ] No source maps exposed in production
- [ ] No sensitive data in DOM attributes
- [ ] Environment variables not exposed to client
- [ ] API keys not hardcoded in frontend code
- [ ] Proper CORS configuration
- [ ] Content Security Policy implemented
- [ ] Sensitive endpoints require authentication










