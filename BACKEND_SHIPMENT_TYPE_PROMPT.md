# Backend Implementation: Shipment Type (`shipmentType`) + Insurance Rules

## Overview
The frontend now sends a **required** `shipmentType` inside the `sender` object. The backend must accept it, validate it, and save it with the booking (sender payload).

### Allowed Values
`shipmentType` must be one of:
- `document`
- `non-document`

## Payload Example (POST `/api/bookings`)

```json
{
  "service": "uae-to-pinas",
  "sender": {
    "fullName": "John Doe",
    "completeAddress": "Dubai, UAE",
    "contactNo": "+971501234567",
    "emailAddress": "john@example.com",
    "agentName": "Agent Name",
    "deliveryOption": "warehouse",
    "shipmentType": "document",
    "insured": false,
    "declaredAmount": 0
  },
  "receiver": { "...": "..." },
  "items": [ { "id": "1", "commodity": "Clothes", "qty": 1 } ],
  "termsAccepted": true,
  "submissionTimestamp": "2026-01-15T10:00:00.000Z"
}
```

## Backend Validation Rules (REQUIRED)

### 1) `shipmentType` is required
- Reject the request if `sender.shipmentType` is missing or not one of `document | non-document`.

### 2) Business rules for insurance + declared value

#### If `shipmentType === "document"`
- `insured` must be `false`
- `declaredAmount` must be `0`
- Backend should **force** these values even if the client sends something else

#### If `shipmentType === "non-document"`
- `insured` must be `true`
- `declaredAmount` must be a **number > 0**
- Backend should reject if `declaredAmount` is missing, not a number, or `<= 0`
- (Optional) enforce a maximum, e.g. `declaredAmount <= 1_000_000`

## Example Express Validation (Node.js)

```js
app.post('/api/bookings', async (req, res) => {
  const { sender } = req.body || {}

  if (!sender) {
    return res.status(400).json({ error: 'sender is required' })
  }

  const shipmentType = sender.shipmentType
  if (shipmentType !== 'document' && shipmentType !== 'non-document') {
    return res.status(400).json({ error: 'sender.shipmentType must be \"document\" or \"non-document\"' })
  }

  if (shipmentType === 'document') {
    sender.insured = false
    sender.declaredAmount = 0
  } else {
    sender.insured = true
    const amount = Number(sender.declaredAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'sender.declaredAmount must be a number > 0 for non-document shipments' })
    }
    // optional max check
    if (amount > 1_000_000) {
      return res.status(400).json({ error: 'sender.declaredAmount cannot exceed 1,000,000' })
    }
    sender.declaredAmount = amount
  }

  // Save booking (including sender.shipmentType)
  const booking = await db.bookings.create({
    ...req.body,
    sender
  })

  return res.json({ success: true, bookingId: booking.id })
})
```

## Database Requirements

Wherever you store sender details, add and persist:
- `shipmentType` (string / enum)
- `insured` (boolean)
- `declaredAmount` (number / decimal)

### MongoDB (example)
```js
sender: {
  shipmentType: String, // 'document' | 'non-document'
  insured: Boolean,
  declaredAmount: Number,
  // ... other sender fields
}
```

### SQL (example)
If sender is stored as JSON, include it inside the sender JSON.
If sender is normalized, add:
```sql
ALTER TABLE senders
ADD COLUMN shipmentType VARCHAR(20) NOT NULL,
ADD COLUMN insured BOOLEAN NOT NULL,
ADD COLUMN declaredAmount DECIMAL(10,2) NOT NULL;
```

## Notes
- Frontend enforces `shipmentType` selection before continuing.
- For **Document**: declared value is locked to `0` in the UI.
- For **Non-Document**: declared value is required and must be `> 0`.


