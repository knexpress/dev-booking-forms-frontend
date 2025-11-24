# Backend Implementation: Form Filler Location Data

## Overview
The frontend now captures the form filler's location using the browser's Geolocation API (latitude and longitude coordinates). This data needs to be saved in the database when a booking is submitted.

## New Fields Required

### Database Schema Changes

Add the following fields to the **Booking/Sender** collection/table:

```javascript
{
  formFillerLatitude: Number,    // Latitude coordinate (e.g., 25.204849)
  formFillerLongitude: Number    // Longitude coordinate (e.g., 55.270783)
}
```

**Field Details:**
- **formFillerLatitude**: Decimal number, typically between -90 and 90
- **formFillerLongitude**: Decimal number, typically between -180 and 180
- Both fields are **optional** (can be null/undefined) in case user denies location permission
- Recommended precision: Store with at least 6 decimal places for accuracy

## API Endpoint Changes

### POST `/api/bookings`

**Request Body Addition:**

The existing booking submission endpoint should now accept these additional fields in the `sender` object:

```json
{
  "sender": {
    "fullName": "...",
    "completeAddress": "...",
    "contactNo": "...",
    "emailAddress": "...",
    "agentName": "...",
    "formFillerLatitude": 25.204849,    // NEW FIELD
    "formFillerLongitude": 55.270783,   // NEW FIELD
    // ... other existing fields
  },
  // ... rest of booking data
}
```

## Validation Requirements

1. **Type Validation:**
   - `formFillerLatitude` must be a number between -90 and 90 (if provided)
   - `formFillerLongitude` must be a number between -180 and 180 (if provided)

2. **Optional Fields:**
   - Both fields are optional - user may deny location permission
   - If one is provided, the other should also be provided (both or neither)

3. **Example Validation:**
   ```javascript
   if (sender.formFillerLatitude !== undefined) {
     if (typeof sender.formFillerLatitude !== 'number' || 
         sender.formFillerLatitude < -90 || 
         sender.formFillerLatitude > 90) {
       throw new Error('Invalid latitude value')
     }
   }
   
   if (sender.formFillerLongitude !== undefined) {
     if (typeof sender.formFillerLongitude !== 'number' || 
         sender.formFillerLongitude < -180 || 
         sender.formFillerLongitude > 180) {
       throw new Error('Invalid longitude value')
     }
   }
   
   // Ensure both are provided together
   if ((sender.formFillerLatitude !== undefined) !== (sender.formFillerLongitude !== undefined)) {
     throw new Error('Both latitude and longitude must be provided together')
   }
   ```

## Database Schema Example

### MongoDB Example:
```javascript
{
  _id: ObjectId("..."),
  referenceNumber: "REF-2024-001",
  sender: {
    fullName: "John Doe",
    completeAddress: "...",
    contactNo: "+971501234567",
    emailAddress: "john@example.com",
    agentName: "Agent Name",
    formFillerLatitude: 25.204849,    // NEW
    formFillerLongitude: 55.270783,   // NEW
    deliveryOption: "warehouse"
  },
  // ... rest of booking data
}
```

### SQL Example:
```sql
ALTER TABLE bookings 
ADD COLUMN form_filler_latitude DECIMAL(10, 8) NULL,
ADD COLUMN form_filler_longitude DECIMAL(11, 8) NULL;

-- Or if storing in sender_details table:
ALTER TABLE sender_details 
ADD COLUMN form_filler_latitude DECIMAL(10, 8) NULL,
ADD COLUMN form_filler_longitude DECIMAL(11, 8) NULL;
```

## Frontend Data Flow

The frontend sends this data in the booking submission:

```javascript
{
  sender: {
    // ... existing fields
    formFillerLatitude: 25.204849,    // From browser geolocation
    formFillerLongitude: 55.270783,   // From browser geolocation
  }
}
```

**Note:** These fields will be `undefined` if:
- User denies location permission
- Browser doesn't support geolocation
- Location capture fails

## Response Format

No changes needed to the response format. The existing booking creation response should work as-is.

## Testing Checklist

- [ ] Database schema updated with new fields
- [ ] API accepts `formFillerLatitude` and `formFillerLongitude` in request
- [ ] Validation implemented for coordinate ranges
- [ ] Data is saved correctly when provided
- [ ] Booking creation works when fields are undefined (user denied permission)
- [ ] Both fields are validated together (both or neither)
- [ ] Existing bookings without these fields still work (backward compatibility)

## Example Test Cases

1. **Valid coordinates:**
   ```json
   {
     "formFillerLatitude": 25.204849,
     "formFillerLongitude": 55.270783
   }
   ```
   Expected: Saved successfully

2. **Missing coordinates (user denied permission):**
   ```json
   {
     // formFillerLatitude and formFillerLongitude not included
   }
   ```
   Expected: Booking saved successfully (fields are optional)

3. **Invalid latitude:**
   ```json
   {
     "formFillerLatitude": 95.0,  // Out of range
     "formFillerLongitude": 55.270783
   }
   ```
   Expected: Validation error

4. **Only one coordinate provided:**
   ```json
   {
     "formFillerLatitude": 25.204849
     // formFillerLongitude missing
   }
   ```
   Expected: Validation error (both must be provided together)

## Additional Notes

- These coordinates represent the physical location where the user filled out the form
- Useful for verification and compliance purposes
- Should be stored securely as it's personal location data
- Consider GDPR/privacy regulations when storing location data
- May be useful for analytics or fraud detection

## Questions?

If you need clarification on:
- Data types or precision
- Validation rules
- Database structure
- API integration

Please refer to the frontend code in `src/components/Step1BookingForm.tsx` (getCurrentLocation function) and `src/types.ts` (SenderDetails interface).

