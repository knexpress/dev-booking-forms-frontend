# OCR API Endpoint Request - EID Front Image

## Endpoint Details

### Request Method & URL
```
POST {API_BASE_URL}/api/ocr
```

Where `API_BASE_URL` is:
- From environment variable: `VITE_API_BASE_URL`
- Default fallback: `http://localhost:5000`

### When is this endpoint called?

This endpoint is called **immediately when the EID front image is captured** in Step 2 (Emirates ID Scan). It's used to:
1. Validate that the captured image is actually an Emirates ID
2. Extract text from the ID using OCR
3. Verify the ID format and validity

### Request Headers
```javascript
{
  'Content-Type': 'application/json'
}
```

### Current Request Body (JSON)

```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
}
```

**Note**: Currently, the request only sends the image. The first name and last name are **NOT** sent to this endpoint.

---

## Frontend Code (Current Implementation)

**File**: `src/services/ocrService.ts`  
**Function**: `validateEmiratesIDWithBackend()`

```typescript
export async function validateEmiratesIDWithBackend(
  imageBase64: string
): Promise<BackendOCRResponse> {
  const apiUrl = `${API_CONFIG.baseUrl}/api/ocr`
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: imageBase64,
    }),
    signal: controller.signal, // 90 second timeout
  })
  
  // ... handle response
}
```

**Called from**: `src/components/Step2EmiratesIDScan.tsx`  
**When**: Immediately after EID front image is captured (auto-capture or manual capture)

---

## Backend Response Format (Expected)

```json
{
  "success": true,
  "isEmiratesID": true,
  "side": "front" | "back" | "unknown",
  "requiresBackSide": false,
  "message": "Emirates ID validated successfully",
  "identification": {
    "isEmiratesID": true,
    "side": "front",
    "confidence": 0.95,
    "reason": "Valid Emirates ID format detected"
  },
  "extractedText": "Full OCR extracted text from the ID...",
  "requestId": "req-123456",
  "timestamp": "2025-01-15T14:30:00.000Z"
}
```

---

## Required Update: Add Name Verification

### Problem
Currently, the `/api/ocr` endpoint only receives the image. It cannot verify if the name on the ID matches the person filling the form.

### Solution
Update the request to include the first name and last name of the person whose EID is being scanned.

### Updated Request Body (Proposed)

```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "firstName": "Ahmed",      // ⚠️ NEW: First name to verify
  "lastName": "Ali"          // ⚠️ NEW: Last name to verify
}
```

### Name Logic (Same as booking endpoint)

- **Service: `uae-to-pinas` (UAE to Philippines)**
  - `firstName` = Sender's firstName
  - `lastName` = Sender's lastName
  - The EID belongs to the **sender** (person in UAE)

- **Service: `ph-to-uae` (Philippines to UAE)**
  - `firstName` = Receiver's firstName
  - `lastName` = Receiver's lastName
  - The EID belongs to the **receiver** (person in UAE)

### Backend Processing (Updated)

When the backend receives this request, it should:

1. **Extract the name from the EID** using OCR
2. **Compare the extracted name** with the provided `firstName` and `lastName`
3. **Return verification result** indicating if names match

### Updated Backend Response Format (Proposed)

```json
{
  "success": true,
  "isEmiratesID": true,
  "side": "front",
  "nameMatch": true,                    // ⚠️ NEW: Whether name matches
  "nameMatchConfidence": 0.95,          // ⚠️ NEW: Confidence score (0.0 to 1.0)
  "extractedName": "AHMED MOHAMMED ALI", // ⚠️ NEW: Name extracted from OCR
  "providedFirstName": "Ahmed",          // ⚠️ NEW: First name sent in request
  "providedLastName": "Ali",              // ⚠️ NEW: Last name sent in request
  "message": "Emirates ID validated successfully. Name matches.",
  "identification": {
    "isEmiratesID": true,
    "side": "front",
    "confidence": 0.95,
    "reason": "Valid Emirates ID format detected"
  },
  "extractedText": "Full OCR extracted text...",
  "requestId": "req-123456",
  "timestamp": "2025-01-15T14:30:00.000Z"
}
```

### Error Response (Name Mismatch)

```json
{
  "success": false,
  "isEmiratesID": true,
  "side": "front",
  "nameMatch": false,
  "nameMatchConfidence": 0.2,
  "extractedName": "AHMED MOHAMMED ALI",
  "providedFirstName": "John",
  "providedLastName": "Doe",
  "message": "Emirates ID is valid, but name does not match. Please ensure you are using the correct ID.",
  "error": "Name mismatch detected"
}
```

---

## Frontend Code Changes Required

### 1. Update `Step2EmiratesIDScan` Component

**File**: `src/components/Step2EmiratesIDScan.tsx`

**Current Props**:
```typescript
interface Step2Props {
  onComplete: (data: Partial<VerificationData>) => void
  onBack: () => void
  service?: string | null
}
```

**Updated Props** (to include booking data):
```typescript
interface Step2Props {
  onComplete: (data: Partial<VerificationData>) => void
  onBack: () => void
  service?: string | null
  bookingData?: BookingFormData | null  // ⚠️ NEW: To access sender/receiver names
}
```

### 2. Update `validateEmiratesIDWithBackend` Function

**File**: `src/services/ocrService.ts`

**Current Signature**:
```typescript
export async function validateEmiratesIDWithBackend(
  imageBase64: string
): Promise<BackendOCRResponse>
```

**Updated Signature**:
```typescript
export async function validateEmiratesIDWithBackend(
  imageBase64: string,
  firstName?: string,  // ⚠️ NEW: Optional first name
  lastName?: string    // ⚠️ NEW: Optional last name
): Promise<BackendOCRResponse>
```

**Updated Implementation**:
```typescript
export async function validateEmiratesIDWithBackend(
  imageBase64: string,
  firstName?: string,
  lastName?: string
): Promise<BackendOCRResponse> {
  const apiUrl = `${API_CONFIG.baseUrl}/api/ocr`
  
  // Build request body
  const requestBody: any = {
    image: imageBase64,
  }
  
  // Add name fields if provided
  if (firstName) {
    requestBody.firstName = firstName
  }
  if (lastName) {
    requestBody.lastName = lastName
  }
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: controller.signal,
  })
  
  // ... rest of the function
}
```

### 3. Update Call Site in `Step2EmiratesIDScan.tsx`

**Current Call**:
```typescript
const validationResult = await validateEmiratesIDWithBackend(croppedBase64)
```

**Updated Call**:
```typescript
// Determine which name to use based on service route
const route = (service || 'uae-to-pinas').toLowerCase()
const isPhToUae = route === 'ph-to-uae'

const firstName = isPhToUae 
  ? bookingData?.receiver?.firstName 
  : bookingData?.sender?.firstName

const lastName = isPhToUae 
  ? bookingData?.receiver?.lastName 
  : bookingData?.sender?.lastName

const validationResult = await validateEmiratesIDWithBackend(
  croppedBase64,
  firstName,
  lastName
)
```

### 4. Update `App.tsx` to Pass Booking Data

**File**: `src/App.tsx`

**Current**:
```typescript
<Step2EmiratesIDScan 
  onComplete={handleStep2Complete}
  onBack={handleBack}
  service={selectedService}
/>
```

**Updated**:
```typescript
<Step2EmiratesIDScan 
  onComplete={handleStep2Complete}
  onBack={handleBack}
  service={selectedService}
  bookingData={bookingData}  // ⚠️ NEW: Pass booking data
/>
```

---

## Example Request (cURL)

### Current Request
```bash
curl -X POST "https://your-api-domain.com/api/ocr" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
  }'
```

### Updated Request (With Name Verification)
```bash
curl -X POST "https://your-api-domain.com/api/ocr" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    "firstName": "Ahmed",
    "lastName": "Ali"
  }'
```

---

## Backend Implementation Notes

1. **Name Matching**: The backend should extract the name from the EID using OCR and compare it with the provided `firstName` and `lastName`.

2. **Optional Fields**: `firstName` and `lastName` should be optional in the request. If not provided, the backend should skip name verification and only validate that it's an Emirates ID.

3. **Confidence Scoring**: Return a confidence score (0.0 to 1.0) indicating how well the names match.

4. **Error Handling**: If name verification fails but the ID is valid, return `success: false` with appropriate error message.

5. **See**: `BACKEND_EID_NAME_VERIFICATION.md` for detailed backend implementation instructions.

---

## Summary

- **Current**: `/api/ocr` only receives the image
- **Required**: `/api/ocr` should also receive `firstName` and `lastName` for name verification
- **When**: This happens immediately when EID front image is captured (before final booking submission)
- **Purpose**: Verify that the name on the ID matches the person filling the form

