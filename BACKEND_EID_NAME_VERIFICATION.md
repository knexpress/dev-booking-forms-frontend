# 🔍 Backend Implementation: Emirates ID Name Verification with OCR

## Overview

The frontend now sends the **first name and last name** of the person whose Emirates ID is being scanned along with the EID front image. The backend must:

1. **Extract the name from the Emirates ID** using OCR
2. **Compare the extracted name** with the provided first name and last name
3. **Return a verification response** indicating whether the names match

## Previous Behavior vs. New Requirement

### Previous Behavior
- Backend only verified if the uploaded image is an Emirates ID or not
- No name matching was performed

### New Requirement
- Backend must extract the name from the Emirates ID using OCR
- Compare extracted name with `eidFrontImageFirstName` and `eidFrontImageLastName`
- Return verification result indicating name match status

---

## Frontend Data Flow

### API Endpoint: `POST /api/bookings`

The frontend now sends the following additional fields in the booking payload:

```json
{
  "service": "uae-to-pinas" | "ph-to-uae",
  "eidFrontImage": "data:image/jpeg;base64,...",
  "eidFrontImageFirstName": "John",        // ⚠️ NEW FIELD
  "eidFrontImageLastName": "Doe",          // ⚠️ NEW FIELD
  "eidBackImage": "data:image/jpeg;base64,...",
  "sender": {
    "firstName": "John",
    "lastName": "Doe",
    // ... other sender fields
  },
  "receiver": {
    "firstName": "Jane",
    "lastName": "Smith",
    // ... other receiver fields
  },
  // ... other booking fields
}
```

### Name Field Logic

- **Service: `uae-to-pinas` (UAE to Philippines)**
  - `eidFrontImageFirstName` = Sender's firstName
  - `eidFrontImageLastName` = Sender's lastName
  - The EID belongs to the **sender** (person in UAE)

- **Service: `ph-to-uae` (Philippines to UAE)**
  - `eidFrontImageFirstName` = Receiver's firstName
  - `eidFrontImageLastName` = Receiver's lastName
  - The EID belongs to the **receiver** (person in UAE)

---

## Backend Implementation Requirements

### 1. OCR Extraction from Emirates ID

Extract the name from the Emirates ID front image using OCR. The name typically appears in the following format on Emirates ID:

- **English Name**: Usually in the format "FIRSTNAME LASTNAME" or "FIRSTNAME MIDDLENAME LASTNAME"
- **Arabic Name**: May also be present, but focus on English name for matching

**Example OCR Output:**
```
Name: AHMED MOHAMMED ALI
or
Name: AHMED MOHAMMED
```

### 2. Name Matching Logic

Compare the OCR-extracted name with the provided `eidFrontImageFirstName` and `eidFrontImageLastName`.

**Matching Strategy:**

1. **Normalize both names:**
   - Convert to uppercase
   - Remove extra spaces
   - Handle common variations (e.g., "Mohammed" vs "Mohammad")

2. **Extract components from OCR text:**
   - Split OCR name into parts (first, middle, last)
   - Handle cases where middle names may be present

3. **Compare:**
   - Match `eidFrontImageFirstName` with the first part of OCR name
   - Match `eidFrontImageLastName` with the last part of OCR name
   - Consider partial matches (e.g., if OCR shows "AHMED MOHAMMED ALI" and provided name is "AHMED ALI", it should match)

### 3. Response Format

Update the booking response to include name verification status:

```json
{
  "success": true,
  "bookingId": "BK-2024-001234",
  "referenceNumber": "REF-2024-001234",
  "eidVerification": {
    "isEmiratesId": true,
    "nameMatch": true,                    // ⚠️ NEW FIELD
    "nameMatchConfidence": 0.95,          // ⚠️ NEW FIELD (0.0 to 1.0)
    "extractedName": "AHMED MOHAMMED ALI", // ⚠️ NEW FIELD
    "providedFirstName": "AHMED",          // ⚠️ NEW FIELD
    "providedLastName": "ALI",            // ⚠️ NEW FIELD
    "verificationMessage": "Name matches Emirates ID" // ⚠️ NEW FIELD
  }
}
```

### 4. Error Handling

Handle the following scenarios:

- **OCR fails to extract name:**
  ```json
  {
    "eidVerification": {
      "isEmiratesId": true,
      "nameMatch": null,
      "nameMatchConfidence": null,
      "extractedName": null,
      "verificationMessage": "Could not extract name from Emirates ID. Manual review required."
    }
  }
  ```

- **Names do not match:**
  ```json
  {
    "eidVerification": {
      "isEmiratesId": true,
      "nameMatch": false,
      "nameMatchConfidence": 0.2,
      "extractedName": "AHMED MOHAMMED ALI",
      "providedFirstName": "JOHN",
      "providedLastName": "DOE",
      "verificationMessage": "Name on Emirates ID does not match provided name. Manual review required."
    }
  }
  ```

- **Partial match (low confidence):**
  ```json
  {
    "eidVerification": {
      "isEmiratesId": true,
      "nameMatch": true,
      "nameMatchConfidence": 0.65,
      "extractedName": "AHMED MOHAMMED",
      "providedFirstName": "AHMED",
      "providedLastName": "MOHAMMED",
      "verificationMessage": "Name partially matches. Manual review recommended."
    }
  }
  ```

---

## Implementation Example (Node.js/Express)

```javascript
const AWS = require('aws-sdk');
const textract = new AWS.Textract({ region: 'me-south-1' });

async function verifyEmiratesIDName(eidFrontImageBase64, providedFirstName, providedLastName) {
  try {
    // 1. Extract text from Emirates ID using OCR
    const imageBuffer = Buffer.from(eidFrontImageBase64.split(',')[1], 'base64');
    
    const textractParams = {
      Document: { Bytes: imageBuffer },
      FeatureTypes: ['FORMS']
    };
    
    const ocrResult = await textract.analyzeDocument(textractParams).promise();
    
    // 2. Extract name from OCR result
    const extractedName = extractNameFromOCR(ocrResult);
    
    if (!extractedName) {
      return {
        isEmiratesId: true,
        nameMatch: null,
        nameMatchConfidence: null,
        extractedName: null,
        verificationMessage: "Could not extract name from Emirates ID. Manual review required."
      };
    }
    
    // 3. Normalize names for comparison
    const normalizedExtracted = normalizeName(extractedName);
    const normalizedProvided = normalizeName(`${providedFirstName} ${providedLastName}`);
    
    // 4. Compare names
    const matchResult = compareNames(
      normalizedExtracted,
      normalizedProvided,
      providedFirstName.toUpperCase(),
      providedLastName.toUpperCase()
    );
    
    return {
      isEmiratesId: true,
      nameMatch: matchResult.matches,
      nameMatchConfidence: matchResult.confidence,
      extractedName: extractedName,
      providedFirstName: providedFirstName,
      providedLastName: providedLastName,
      verificationMessage: matchResult.message
    };
    
  } catch (error) {
    console.error('EID name verification error:', error);
    return {
      isEmiratesId: false,
      nameMatch: false,
      nameMatchConfidence: 0,
      extractedName: null,
      verificationMessage: "Error verifying Emirates ID name."
    };
  }
}

function extractNameFromOCR(ocrResult) {
  // Parse OCR blocks to find name field
  // Emirates ID name field is typically labeled "Name" or "Full Name"
  // Implementation depends on your OCR provider
  // This is a placeholder - implement based on your OCR service
  for (const block of ocrResult.Blocks) {
    if (block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY')) {
      // Find "Name" key and extract corresponding value
      // Return the extracted name string
    }
  }
  return null;
}

function normalizeName(name) {
  return name
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, ''); // Remove special characters
}

function compareNames(extractedName, providedFullName, providedFirst, providedLast) {
  const extractedParts = extractedName.split(' ').filter(p => p.length > 0);
  
  if (extractedParts.length === 0) {
    return {
      matches: false,
      confidence: 0,
      message: "Could not parse extracted name."
    };
  }
  
  // Check if first name matches
  const firstNameMatches = extractedParts[0] === providedFirst;
  
  // Check if last name matches (could be last part or second part)
  const lastNameMatches = 
    extractedParts[extractedParts.length - 1] === providedLast ||
    (extractedParts.length >= 2 && extractedParts[1] === providedLast);
  
  // Calculate confidence
  let confidence = 0;
  if (firstNameMatches && lastNameMatches) {
    confidence = 0.95; // High confidence
  } else if (firstNameMatches || lastNameMatches) {
    confidence = 0.65; // Medium confidence
  } else {
    confidence = 0.2; // Low confidence
  }
  
  // Check for exact match
  const exactMatch = extractedName === providedFullName;
  if (exactMatch) {
    confidence = 1.0;
  }
  
  return {
    matches: firstNameMatches && lastNameMatches,
    confidence: confidence,
    message: firstNameMatches && lastNameMatches
      ? "Name matches Emirates ID"
      : firstNameMatches || lastNameMatches
      ? "Name partially matches. Manual review recommended."
      : "Name on Emirates ID does not match provided name. Manual review required."
  };
}

// In your booking endpoint handler
app.post('/api/bookings', async (req, res) => {
  const {
    service,
    eidFrontImage,
    eidFrontImageFirstName,  // ⚠️ NEW
    eidFrontImageLastName,    // ⚠️ NEW
    eidBackImage,
    sender,
    receiver,
    // ... other fields
  } = req.body;
  
  // Verify EID name
  const eidVerification = await verifyEmiratesIDName(
    eidFrontImage,
    eidFrontImageFirstName,
    eidFrontImageLastName
  );
  
  // Save booking to database
  const booking = await db.bookings.create({
    service,
    eidFrontImage,
    eidFrontImageFirstName,  // Save for reference
    eidFrontImageLastName,   // Save for reference
    eidBackImage,
    sender,
    receiver,
    eidVerificationStatus: eidVerification.nameMatch,
    eidVerificationConfidence: eidVerification.nameMatchConfidence,
    // ... other fields
  });
  
  res.json({
    success: true,
    bookingId: booking.id,
    referenceNumber: booking.referenceNumber,
    eidVerification: eidVerification
  });
});
```

---

## Database Schema Updates

Add fields to store name verification results:

### MongoDB Example:
```javascript
{
  eidFrontImageFirstName: String,
  eidFrontImageLastName: String,
  eidVerificationStatus: Boolean,  // true = match, false = no match, null = could not verify
  eidVerificationConfidence: Number, // 0.0 to 1.0
  eidExtractedName: String,         // Name extracted from OCR
}
```

### SQL Example:
```sql
ALTER TABLE bookings 
ADD COLUMN eidFrontImageFirstName VARCHAR(100) NULL,
ADD COLUMN eidFrontImageLastName VARCHAR(100) NULL,
ADD COLUMN eidVerificationStatus BOOLEAN NULL,
ADD COLUMN eidVerificationConfidence DECIMAL(3,2) NULL,
ADD COLUMN eidExtractedName VARCHAR(255) NULL;
```

---

## Testing Checklist

- [ ] OCR successfully extracts name from Emirates ID
- [ ] Name matching works when first name and last name match exactly
- [ ] Name matching handles middle names correctly
- [ ] Name matching is case-insensitive
- [ ] Name matching handles name variations (e.g., "Mohammed" vs "Mohammad")
- [ ] Returns appropriate response when OCR fails
- [ ] Returns appropriate response when names don't match
- [ ] Returns confidence score correctly
- [ ] Handles missing `eidFrontImageFirstName` or `eidFrontImageLastName` gracefully
- [ ] Logs verification results for audit purposes

---

## Important Notes

1. **OCR Provider**: Use your existing OCR service (AWS Textract, Azure Vision, Google Cloud Vision, etc.) to extract text from the Emirates ID.

2. **Name Format Variations**: Emirates IDs may display names in different formats:
   - "FIRSTNAME LASTNAME"
   - "FIRSTNAME MIDDLENAME LASTNAME"
   - "LASTNAME, FIRSTNAME" (less common)

3. **Confidence Thresholds**: Consider implementing thresholds:
   - **High Confidence (≥0.9)**: Auto-approve
   - **Medium Confidence (0.6-0.89)**: Flag for manual review
   - **Low Confidence (<0.6)**: Require manual review

4. **Manual Review**: Always allow manual override for edge cases where OCR or matching fails.

5. **Audit Trail**: Log all verification attempts and results for compliance and debugging.

---

## Questions or Issues?

If you encounter any issues implementing this feature, please contact the frontend team for clarification on:
- Expected name formats
- Edge cases to handle
- Confidence score thresholds
- Error handling requirements

