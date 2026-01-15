# Backend Implementation: Declared Value for Insured Shipments

## Overview
The frontend now captures the **declared value** when a user selects the "Insured" option for their shipment. This value must be saved in the database along with the booking data.

## New Field Required

### Database Schema Changes

Add the following field to the **Booking/Sender** collection/table:

```javascript
{
  declaredAmount: Number    // Declared value in AED (e.g., 1000.50)
}
```

**Field Details:**
- **declaredAmount**: Decimal number, represents the declared value of the insured shipment
- Field is **optional** (can be null/undefined) - only present when `insured` is `true`
- Should be stored as a number/decimal type (not string)
- Recommended precision: Store with at least 2 decimal places for currency accuracy

## API Endpoint Changes

### POST `/api/bookings`

**Request Body Addition:**

The existing booking submission endpoint should now accept the `declaredAmount` field in the `sender` object:

```json
{
  "service": "uae-to-pinas",
  "sender": {
    "fullName": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "completeAddress": "123 Main St, Dubai",
    "contactNo": "+971501234567",
    "emailAddress": "john@example.com",
    "agentName": "Agent Name",
    "deliveryOption": "warehouse",
    "insured": true,                    // ⚠️ NEW: Insurance flag
    "declaredAmount": 1500.50          // ⚠️ NEW: Declared value (only when insured is true)
  },
  "receiver": { ... },
  "items": [ ... ],
  // ... rest of booking data
}
```

## Validation Requirements

1. **Type Validation:**
   - `declaredAmount` must be a number (if provided)
   - Must be a positive number (greater than 0)
   - Should not exceed a reasonable maximum (e.g., 1,000,000 AED)

2. **Conditional Validation:**
   - If `insured` is `true`, then `declaredAmount` **MUST** be provided and must be a positive number
   - If `insured` is `false` or not provided, then `declaredAmount` should be `null` or `undefined`

3. **Example Validation:**
   ```javascript
   // In your booking endpoint handler
   if (sender.insured === true) {
     if (!sender.declaredAmount || typeof sender.declaredAmount !== 'number' || sender.declaredAmount <= 0) {
       return res.status(400).json({
         error: 'declaredAmount is required and must be a positive number when insured is true'
       })
     }
     if (sender.declaredAmount > 1000000) {
       return res.status(400).json({
         error: 'declaredAmount cannot exceed 1,000,000 AED'
       })
     }
   } else {
     // If not insured, declaredAmount should not be set
     sender.declaredAmount = undefined
   }
   ```

## Database Schema Examples

### MongoDB Example:
```javascript
{
  sender: {
    fullName: String,
    firstName: String,
    lastName: String,
    completeAddress: String,
    contactNo: String,
    emailAddress: String,
    agentName: String,
    deliveryOption: String,  // 'warehouse' or 'pickup'
    insured: Boolean,         // Insurance flag
    declaredAmount: Number    // ⚠️ NEW: Declared value (optional, only when insured is true)
  },
  // ... other booking fields
}
```

### SQL Example:
```sql
-- If sender is stored in a separate table
ALTER TABLE senders 
ADD COLUMN declaredAmount DECIMAL(10, 2) NULL;

-- Or if sender is stored as JSON in bookings table
-- The JSON structure should include declaredAmount in the sender object
```

### Example Database Record:
```javascript
{
  booking_id: "BK-2025-001",
  service: "uae-to-pinas",
  sender: {
    fullName: "John Doe",
    firstName: "John",
    lastName: "Doe",
    completeAddress: "123 Main St, Dubai",
    contactNo: "+971501234567",
    emailAddress: "john@example.com",
    agentName: "Agent Name",
    deliveryOption: "warehouse",
    insured: true,
    declaredAmount: 1500.50  // ⚠️ NEW FIELD
  },
  // ... rest of booking data
}
```

## Backend Processing Requirements

When the backend receives a booking request:

1. **Extract the declaredAmount** from `sender.declaredAmount` (if present)
2. **Validate** that if `insured` is `true`, `declaredAmount` is provided and valid
3. **Save** the `declaredAmount` to the database along with other sender information
4. **Handle** cases where `insured` is `false` - in this case, `declaredAmount` should be `null` or `undefined`

## Example Backend Handler (Node.js/Express)

```javascript
app.post('/api/bookings', async (req, res) => {
  const {
    service,
    sender,
    receiver,
    items,
    // ... other fields
  } = req.body

  // Validate declaredAmount if insured
  if (sender.insured === true) {
    if (!sender.declaredAmount || typeof sender.declaredAmount !== 'number' || sender.declaredAmount <= 0) {
      return res.status(400).json({
        error: 'declaredAmount is required and must be a positive number when insured is true'
      })
    }
    if (sender.declaredAmount > 1000000) {
      return res.status(400).json({
        error: 'declaredAmount cannot exceed 1,000,000 AED'
      })
    }
  } else {
    // Clear declaredAmount if not insured
    sender.declaredAmount = undefined
  }

  // Save to database
  const booking = await db.bookings.create({
    service,
    sender: {
      ...sender,
      declaredAmount: sender.insured ? sender.declaredAmount : null  // Save as null if not insured
    },
    receiver,
    items,
    // ... other fields
  })

  res.json({
    success: true,
    bookingId: booking.id,
    // ... other response fields
  })
})
```

## Testing Checklist

- [ ] Verify that `declaredAmount` is saved when `insured` is `true` and a valid amount is provided
- [ ] Verify that `declaredAmount` is `null` or `undefined` when `insured` is `false`
- [ ] Verify validation rejects bookings where `insured` is `true` but `declaredAmount` is missing
- [ ] Verify validation rejects bookings where `declaredAmount` is not a positive number
- [ ] Verify validation rejects bookings where `declaredAmount` exceeds the maximum limit
- [ ] Verify that existing bookings without `declaredAmount` still work (backward compatibility)

## Notes

- The frontend validates that `declaredAmount` is required when `insured` is checked
- The frontend validates that `declaredAmount` is a positive number between 0 and 1,000,000
- The declared value is entered in AED (UAE Dirhams)
- This field is only relevant for the `uae-to-pinas` service route (insurance is not available for `ph-to-uae` route)





