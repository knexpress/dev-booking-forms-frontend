# EID Front Image - Backend Request Details

## When is the EID Front Image Sent?

The EID front image is **NOT sent immediately when captured**. It is stored in the frontend state and sent later when the user completes the entire booking form and clicks "Submit" on the final confirmation page.

## Endpoint Details

### Request Method & URL
```
POST {API_BASE_URL}/api/bookings
```

Where `API_BASE_URL` is:
- From environment variable: `VITE_API_BASE_URL`
- Default fallback: `http://localhost:5000`

### Request Headers
```javascript
{
  'Content-Type': 'application/json'
}
```

### Request Body (JSON)

The EID front image is sent as part of the complete booking payload:

```json
{
  "service": "uae-to-pinas" | "ph-to-uae",
  "sender": {
    "fullName": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "completeAddress": "123 Main St, Dubai",
    "contactNo": "+971501234567",
    "emailAddress": "john@example.com",
    "formFillerLatitude": 25.204849,
    "formFillerLongitude": 55.270783,
    // ... other sender fields
  },
  "receiver": {
    "fullName": "Jane Smith",
    "firstName": "Jane",
    "lastName": "Smith",
    "completeAddress": "456 Business Bay, Dubai",
    "contactNo": "+971501234568",
    "emailAddress": "jane@example.com",
    // ... other receiver fields
  },
  "items": [
    {
      "id": "item-1",
      "commodity": "Electronics",
      "qty": 5
    }
  ],
  "eidFrontImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",  // ⚠️ EID Front Image (Base64)
  "eidFrontImageFirstName": "John",  // ⚠️ NEW: First name of person whose EID is being sent
  "eidFrontImageLastName": "Doe",    // ⚠️ NEW: Last name of person whose EID is being sent
  "eidBackImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "philippinesIdFront": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",  // Optional (for ph-to-uae route)
  "philippinesIdBack": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",   // Optional (for ph-to-uae route)
  "customerImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",  // First face image
  "customerImages": ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."],  // All face images
  "termsAccepted": true,
  "submissionTimestamp": "2025-01-15T14:30:00.000Z"
}
```

## Important Fields for EID Front Image

### 1. `eidFrontImage` (Required)
- **Type**: String (Base64 encoded image)
- **Format**: `data:image/jpeg;base64,{base64_string}` or `data:image/png;base64,{base64_string}`
- **Description**: The complete booking form submission includes the EID front image as a base64-encoded string

### 2. `eidFrontImageFirstName` (NEW - Required)
- **Type**: String
- **Description**: First name of the person whose Emirates ID is being sent
- **Logic**:
  - If `service === "uae-to-pinas"`: Uses **Sender's** firstName
  - If `service === "ph-to-uae"`: Uses **Receiver's** firstName

### 3. `eidFrontImageLastName` (NEW - Required)
- **Type**: String
- **Description**: Last name of the person whose Emirates ID is being sent
- **Logic**:
  - If `service === "uae-to-pinas"`: Uses **Sender's** lastName
  - If `service === "ph-to-uae"`: Uses **Receiver's** lastName

## Frontend Code (Reference)

### Where the Request is Made
**File**: `src/App.tsx`  
**Function**: `handleFinalSubmit()`

```typescript
// Determine service route
const serviceRoute = (selectedService || 'uae-to-pinas').toLowerCase()
const isPhToUae = serviceRoute === 'ph-to-uae'

// Get the appropriate name based on service route
// UAE to Philippines: Use Sender's name
// Philippines to UAE: Use Receiver's name
const eidFrontImageFirstName = isPhToUae 
  ? bookingData?.receiver?.firstName 
  : bookingData?.sender?.firstName
const eidFrontImageLastName = isPhToUae 
  ? bookingData?.receiver?.lastName 
  : bookingData?.sender?.lastName

const finalData = {
  ...bookingData!,
  service: selectedService || 'uae-to-pinas',
  eidFrontImage: verificationData.eidFrontImage,
  eidFrontImageFirstName: eidFrontImageFirstName,
  eidFrontImageLastName: eidFrontImageLastName,
  eidBackImage: verificationData.eidBackImage,
  // ... other fields
}

// Send to backend
const response = await fetch(`${API_CONFIG.baseUrl}/api/bookings`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(finalData)
})
```

## Example Request (cURL)

```bash
curl -X POST "https://your-api-domain.com/api/bookings" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "uae-to-pinas",
    "sender": {
      "firstName": "Ahmed",
      "lastName": "Ali",
      "fullName": "Ahmed Ali",
      "contactNo": "+971501234567",
      "emailAddress": "ahmed@example.com",
      "completeAddress": "Dubai, UAE"
    },
    "receiver": {
      "firstName": "Maria",
      "lastName": "Santos",
      "fullName": "Maria Santos",
      "contactNo": "+639123456789",
      "emailAddress": "maria@example.com",
      "completeAddress": "Manila, Philippines"
    },
    "items": [{"id": "1", "commodity": "Electronics", "qty": 2}],
    "eidFrontImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    "eidFrontImageFirstName": "Ahmed",
    "eidFrontImageLastName": "Ali",
    "eidBackImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    "customerImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    "customerImages": ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."],
    "termsAccepted": true,
    "submissionTimestamp": "2025-01-15T14:30:00.000Z"
  }'
```

## Backend Processing Requirements

When the backend receives this request, it should:

1. **Extract the EID front image** from `eidFrontImage` (base64 string)
2. **Extract the name** from the EID using OCR
3. **Compare** the OCR-extracted name with:
   - `eidFrontImageFirstName`
   - `eidFrontImageLastName`
4. **Return verification result** indicating if names match

See `BACKEND_EID_NAME_VERIFICATION.md` for detailed backend implementation instructions.

## Notes

- The EID front image is sent as a **base64-encoded string**, not as a file upload
- The image format can be JPEG or PNG (indicated in the data URI prefix)
- The image is sent **only once** during final booking submission, not when initially captured
- The `eidFrontImageFirstName` and `eidFrontImageLastName` fields are **conditionally set** based on the service route

