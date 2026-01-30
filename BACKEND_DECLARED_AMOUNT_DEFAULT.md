# Backend Implementation: Declared Amount Default Value

## Overview
The frontend has been updated to **remove the declared amount input field** from the user interface. When a user selects the "Insured" option, the backend should automatically set `declaredAmount` to `0` by default instead of requiring the user to input a value.

## Changes Required

### 1. API Endpoint Changes

#### POST `/api/bookings`

**Request Body - Declared Amount is Optional:**

The booking submission endpoint should **NO LONGER** require `declaredAmount` in the `sender` object. The field should be optional:

```json
{
  "sender": {
    "fullName": "...",
    "completeAddress": "...",
    "contactNo": "...",
    "emailAddress": "...",
    "agentName": "...",
    "insured": true,              // User selects this checkbox
    "declaredAmount": 0            // OPTIONAL - Frontend will send 0 if insured, undefined if not insured
    // ... other existing fields
  },
  // ... rest of booking data
}
```

**Important:** The frontend will now send:
- `declaredAmount: 0` when `insured: true`
- `declaredAmount: undefined` (or field omitted) when `insured: false`

### 2. Backend Logic Changes

**Default Value Assignment:**

The backend should handle the declared amount as follows:

```javascript
// When processing booking submission
const sender = {
  ...req.body.sender,
  // If insured is true and declaredAmount is not provided or is 0, set to 0
  declaredAmount: req.body.sender.insured 
    ? (req.body.sender.declaredAmount || 0)
    : undefined
}
```

**Logic:**
- If `insured === true`:
  - Use `declaredAmount` from request if provided
  - If `declaredAmount` is missing, `0`, `null`, or `undefined`, default to `0`
- If `insured === false`:
  - Set `declaredAmount` to `undefined` or `null` (don't store it)

### 3. Validation Changes

**Remove Required Validation for Declared Amount:**

The backend should **NO LONGER** validate that `declaredAmount` is required when `insured` is true. Instead, it should automatically default to `0`.

**Before (OLD - Remove this):**
```javascript
if (sender.insured && (!sender.declaredAmount || sender.declaredAmount <= 0)) {
  return res.status(400).json({ 
    error: 'Declared amount is required when insured is selected' 
  })
}
```

**After (NEW - Use this):**
```javascript
// No validation needed - automatically default to 0 if insured
if (sender.insured) {
  sender.declaredAmount = sender.declaredAmount || 0
} else {
  sender.declaredAmount = undefined
}
```

### 4. Database Schema

**No Schema Changes Required:**

The database schema can remain the same. The `declaredAmount` field should:
- Accept `0` as a valid value
- Be optional (can be `null` or `undefined` when `insured` is `false`)

**Example Schema (MongoDB/Mongoose):**
```javascript
declaredAmount: {
  type: Number,
  default: undefined,  // or null
  min: 0,
  max: 1000000
}
```

**Example Schema (SQL/Sequelize):**
```javascript
declaredAmount: {
  type: DataTypes.DECIMAL(10, 2),
  allowNull: true,
  defaultValue: null,
  validate: {
    min: 0,
    max: 1000000
  }
}
```

### 5. Data Processing Example

**Backend Processing Logic:**

```javascript
// Example implementation
function processBookingData(bookingData) {
  const sender = { ...bookingData.sender }
  
  // Handle declared amount based on insured status
  if (sender.insured) {
    // If insured is true, default to 0 if not provided
    sender.declaredAmount = sender.declaredAmount ?? 0
    
    // Ensure it's a valid number
    if (typeof sender.declaredAmount !== 'number' || sender.declaredAmount < 0) {
      sender.declaredAmount = 0
    }
  } else {
    // If insured is false, don't store declared amount
    sender.declaredAmount = undefined
  }
  
  return { ...bookingData, sender }
}
```

### 6. Response Format

**API Response should reflect the stored value:**

```json
{
  "success": true,
  "booking": {
    "sender": {
      "fullName": "...",
      "insured": true,
      "declaredAmount": 0    // Should show 0 when insured is true
    }
  }
}
```

### 7. Testing Checklist

After implementing the changes, verify:

- [ ] API accepts booking with `insured: true` and `declaredAmount: 0`
- [ ] API accepts booking with `insured: true` and `declaredAmount` omitted (defaults to 0)
- [ ] API accepts booking with `insured: false` and `declaredAmount` omitted
- [ ] API stores `declaredAmount: 0` in database when `insured: true`
- [ ] API stores `declaredAmount: null/undefined` when `insured: false`
- [ ] No validation errors occur when `declaredAmount` is 0
- [ ] Existing bookings with declared amounts continue to work
- [ ] API responses show correct `declaredAmount` values

### 8. Migration Strategy

**For Existing Data:**

1. **Option A: Leave existing data (Recommended)**
   - Keep existing `declaredAmount` values as they are
   - Only apply default `0` for new bookings when `insured: true` and no amount provided
   - No migration needed

2. **Option B: Update existing insured bookings with null amounts**
   - If you want to set all insured bookings with `null` or missing `declaredAmount` to `0`:
   ```javascript
   // MongoDB example
   db.bookings.updateMany(
     { "sender.insured": true, "sender.declaredAmount": { $in: [null, undefined] } },
     { $set: { "sender.declaredAmount": 0 } }
   )
   ```

### 9. Summary

**What Changed:**
- ✅ Frontend no longer asks users to input declared amount
- ✅ Frontend automatically sends `declaredAmount: 0` when `insured: true`
- ✅ Frontend sends `declaredAmount: undefined` when `insured: false`

**Backend Requirements:**
- ✅ Accept `declaredAmount` as optional in API requests
- ✅ Default `declaredAmount` to `0` when `insured: true` and value is missing/0
- ✅ Set `declaredAmount` to `undefined/null` when `insured: false`
- ✅ Remove validation that requires declared amount input
- ✅ Store `0` as a valid value in the database

**What to Keep:**
- ✅ `insured` field functionality (checkbox)
- ✅ Database schema for `declaredAmount` (just change default behavior)
- ✅ All other booking functionality

## Example Request/Response

**Request (Insured = true):**
```json
{
  "sender": {
    "fullName": "John Doe",
    "insured": true,
    "declaredAmount": 0
  }
}
```

**Request (Insured = false):**
```json
{
  "sender": {
    "fullName": "John Doe",
    "insured": false
    // declaredAmount omitted
  }
}
```

**Database Storage:**
- When `insured: true` → Store `declaredAmount: 0`
- When `insured: false` → Store `declaredAmount: null` or omit field

## Questions?

If you have any questions about these changes, please refer to:
- Frontend code: `src/components/Step1BookingForm.tsx` (Insurance section)
- Frontend types: `src/types.ts` (SenderDetails interface)

The frontend will now always send `declaredAmount: 0` when insured is selected, and the backend should accept and store this value.

