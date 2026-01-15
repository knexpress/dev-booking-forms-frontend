import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ArrowLeft, ArrowRight, Plane, ChevronDown, AlertCircle, AlertTriangle } from 'lucide-react'
import { BookingFormData } from '../types'

interface Step1Props {
  onNext: (senderData: Partial<BookingFormData>) => void
  onBack?: () => void
  initialData?: BookingFormData | null
  service?: string | null
}

export default function Step1BookingForm({ onNext, onBack, initialData, service }: Step1Props) {
  const { handleSubmit } = useForm<BookingFormData>({
    defaultValues: initialData || {}
  })

  // Determine route
  const route = (service || initialData?.service || 'uae-to-pinas').toLowerCase()
  const isPhToUae = route === 'ph-to-uae'
  const routeDisplay = isPhToUae ? 'PHILIPPINES TO UAE' : 'UAE TO PHILIPPINES'

  // Local state for new fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [country, setCountry] = useState(isPhToUae ? 'PHILIPPINES' : 'UNITED ARAB EMIRATES')
  const [emirates, _setEmirates] = useState('')
  const [city, _setCity] = useState('')
  const [district, _setDistrict] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [landmark, _setLandmark] = useState('')
  const [dialCode, setDialCode] = useState('+971')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [emailAddress, setEmailAddress] = useState('')
  const [agentName, setAgentName] = useState('')
  const [senderDeliveryOption, setSenderDeliveryOption] = useState<'warehouse' | 'pickup'>('warehouse')
  const [shipmentType, setShipmentType] = useState<'document' | 'non-document' | ''>('')
  const [declaredAmount, setDeclaredAmount] = useState<string>('')

  // PH to UAE now supports both warehouse drop off and pickup as well.

  // Validation state
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Validate field
  const validateField = (name: string, value: string) => {
    if (!value || value.trim() === '') {
      setValidationErrors(prev => ({ ...prev, [name]: 'This field is required' }))
      return false
    }
    
    // Email validation (only if value is provided - field is optional)
    if (name === 'emailAddress') {
      if (value && value.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value.trim())) {
          setValidationErrors(prev => ({ ...prev, [name]: 'Please enter a valid email address' }))
          return false
        }
      }
      // Email is optional, so if empty, it's valid
      return true
    }
    
    // Phone number validation
    if (name === 'phoneNumber') {
      const phoneValue = value.trim()
      if (dialCode === '+971') {
        // UAE: 9 digits
        if (phoneValue.length !== 9 || !/^\d{9}$/.test(phoneValue)) {
          setValidationErrors(prev => ({ ...prev, [name]: 'UAE phone number must be 9 digits' }))
          return false
        }
      } else if (dialCode === '+63') {
        // Philippines: 10 digits
        if (phoneValue.length !== 10 || !/^\d{10}$/.test(phoneValue)) {
          setValidationErrors(prev => ({ ...prev, [name]: 'Philippines phone number must be 10 digits' }))
          return false
        }
      }
    }
    
    // First name validation
    if (name === 'firstName') {
      const nameValue = value.trim()
      if (nameValue.length < 2) {
        setValidationErrors(prev => ({ ...prev, [name]: 'First name must be at least 2 characters' }))
        return false
      }
      if (nameValue.length > 50) {
        setValidationErrors(prev => ({ ...prev, [name]: 'First name must be less than 50 characters' }))
        return false
      }
      if (!/^[a-zA-Z\s]+$/.test(nameValue)) {
        setValidationErrors(prev => ({ ...prev, [name]: 'First name can only contain letters and spaces' }))
        return false
      }
    }
    
    // Last name validation
    if (name === 'lastName') {
      const nameValue = value.trim()
      if (nameValue.length < 2) {
        setValidationErrors(prev => ({ ...prev, [name]: 'Last name must be at least 2 characters' }))
        return false
      }
      if (nameValue.length > 50) {
        setValidationErrors(prev => ({ ...prev, [name]: 'Last name must be less than 50 characters' }))
        return false
      }
      if (!/^[a-zA-Z\s]+$/.test(nameValue)) {
        setValidationErrors(prev => ({ ...prev, [name]: 'Last name can only contain letters and spaces' }))
        return false
      }
    }
    
    // Address Line 1 validation
    if (name === 'addressLine1') {
      const addressValue = value.trim()
      if (addressValue.length < 5) {
        setValidationErrors(prev => ({ ...prev, [name]: 'Address must be at least 5 characters' }))
        return false
      }
      if (addressValue.length > 200) {
        setValidationErrors(prev => ({ ...prev, [name]: 'Address must be less than 200 characters' }))
        return false
      }
    }
    
    // Agent Name validation
    if (name === 'agentName') {
      const agentNameValue = value.trim()
      if (agentNameValue.length < 2) {
        setValidationErrors(prev => ({ ...prev, [name]: 'Agent name must be at least 2 characters' }))
        return false
      }
      if (agentNameValue.length > 50) {
        setValidationErrors(prev => ({ ...prev, [name]: 'Agent name must be less than 50 characters' }))
        return false
      }
      if (!/^[a-zA-Z\s]+$/.test(agentNameValue)) {
        setValidationErrors(prev => ({ ...prev, [name]: 'Agent name can only contain letters and spaces' }))
        return false
      }
    }

    // Shipment Type validation
    if (name === 'shipmentType') {
      const v = value.trim()
      if (v !== 'document' && v !== 'non-document') {
        setValidationErrors(prev => ({ ...prev, [name]: 'Please select a shipment type' }))
        return false
      }
    }
    
    // Declared Amount validation
    if (name === 'declaredAmount') {
      // Declared value is only required/editable for Non-Document shipments
      if (shipmentType === 'document') {
        setValidationErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[name]
          return newErrors
        })
        return true
      }

      const amountValue = value.trim()
      if (!amountValue || amountValue === '') {
        setValidationErrors(prev => ({ ...prev, [name]: 'Declared value is required' }))
        return false
      }
      const numValue = parseFloat(amountValue)
      if (isNaN(numValue)) {
        setValidationErrors(prev => ({ ...prev, [name]: 'Declared value must be a valid number' }))
        return false
      }
      if (numValue <= 0) {
        setValidationErrors(prev => ({ ...prev, [name]: 'Declared value must be greater than 0' }))
        return false
      }
      if (numValue > 1000000) {
        setValidationErrors(prev => ({ ...prev, [name]: 'Declared value cannot exceed 1,000,000 AED' }))
        return false
      }
    }
    
    
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[name]
      return newErrors
    })
    return true
  }

  // Handle field blur
  const handleBlur = (name: string, value: string) => {
    setTouched(prev => ({ ...prev, [name]: true }))
    validateField(name, value)
  }

  // Update country when route changes
  useEffect(() => {
    setCountry(isPhToUae ? 'PHILIPPINES' : 'UNITED ARAB EMIRATES')
    // Also update dial code based on route
    if (isPhToUae) {
      setDialCode('+63')
    } else {
      setDialCode('+971')
    }
  }, [isPhToUae])

  useEffect(() => {
    if (initialData?.sender) {
      // Split fullName if it exists
      const nameParts = initialData.sender.fullName?.split(' ') || []
      if (nameParts.length > 0) {
        setFirstName(nameParts[0])
        setLastName(nameParts.slice(1).join(' ') || '')
      }
      // Extract phone parts if contactNo exists
      if (initialData.sender.contactNo) {
        if (initialData.sender.contactNo.startsWith('+971')) {
          setDialCode('+971')
          setPhoneNumber(initialData.sender.contactNo.replace('+971', ''))
        } else if (initialData.sender.contactNo.startsWith('+63')) {
          setDialCode('+63')
          setPhoneNumber(initialData.sender.contactNo.replace('+63', ''))
        }
      }
      if (initialData.sender.completeAddress) {
        setAddressLine1(initialData.sender.completeAddress)
      }
      // Set email and agent name if they exist
      if (initialData.sender.emailAddress) {
        setEmailAddress(initialData.sender.emailAddress)
      }
      if (initialData.sender.agentName) {
        setAgentName(initialData.sender.agentName)
      }
      // Set delivery option if exists
      if (initialData.sender.deliveryOption && (initialData.sender.deliveryOption === 'warehouse' || initialData.sender.deliveryOption === 'pickup')) {
        setSenderDeliveryOption(initialData.sender.deliveryOption)
      }
      // Set shipment type if exists (default to non-document if not present)
      const initialShipmentType = (initialData.sender as any)?.shipmentType
      if (initialShipmentType === 'document' || initialShipmentType === 'non-document') {
        setShipmentType(initialShipmentType)
      }
      // Set declared amount if exists
      if (initialData.sender.declaredAmount !== undefined) {
        setDeclaredAmount(initialData.sender.declaredAmount.toString())
      }
      // Set country from initialData if it exists, otherwise use route-based default
      if (initialData.sender.country) {
        setCountry(initialData.sender.country)
      } else {
        setCountry(isPhToUae ? 'PHILIPPINES' : 'UNITED ARAB EMIRATES')
      }
    }
  }, [initialData, isPhToUae])


  const onSubmit = (_data: BookingFormData) => {
    // Validate all required fields
    const fieldValidations = [
      { name: 'firstName', value: firstName },
      { name: 'lastName', value: lastName },
      { name: 'phoneNumber', value: phoneNumber },
      { name: 'addressLine1', value: addressLine1 },
      { name: 'agentName', value: agentName }
    ]

    let isValid = true
    fieldValidations.forEach(({ name, value }) => {
      setTouched(prev => ({ ...prev, [name]: true }))
      if (!validateField(name, value)) {
        isValid = false
      }
    })

    // Validate shipment type (required)
    setTouched(prev => ({ ...prev, shipmentType: true }))
    if (!validateField('shipmentType', shipmentType)) {
      isValid = false
    }
    
    // Validate email if provided (optional field)
    if (emailAddress && emailAddress.trim() !== '') {
      setTouched(prev => ({ ...prev, emailAddress: true }))
      if (!validateField('emailAddress', emailAddress)) {
        isValid = false
      }
    }

    // Validate declared amount (required for Non-Document shipments)
    if (shipmentType === 'non-document') {
      setTouched(prev => ({ ...prev, declaredAmount: true }))
      if (!validateField('declaredAmount', declaredAmount)) {
        isValid = false
      }
    }

    if (!isValid) {
      return
    }

    // Combine firstName and lastName
    const fullName = `${firstName} ${lastName}`.trim()
    
    // Build complete address (just use addressLine1)
    const completeAddress = addressLine1 || ''

    // Combine dialCode and phoneNumber
    const contactNo = `${dialCode}${phoneNumber}`

    // Update form data with sender details only
    const senderData: Partial<BookingFormData> = {
      sender: {
        fullName,
        firstName,
        lastName,
        completeAddress,
        country: country || (isPhToUae ? 'PHILIPPINES' : 'UNITED ARAB EMIRATES'),
        emirates,
        city,
        district,
        zone: '', // Zone field removed from UI but kept for backward compatibility
        addressLine1,
        landmark,
        dialCode,
        phoneNumber,
        contactNo,
        emailAddress: emailAddress.trim(),
        agentName: agentName.trim(),
        deliveryOption: senderDeliveryOption,
        // Shipment type + insurance/declared value rules
        // - Document: insured=false, declaredAmount=0, declared value input disabled
        // - Non-Document: insured=true, declaredAmount must be > 0
        shipmentType: shipmentType as any,
        insured: shipmentType === 'document' ? false : true,
        declaredAmount: shipmentType === 'document'
          ? 0
          : (() => {
              const amount = parseFloat(declaredAmount)
              return (!isNaN(amount) && amount > 0) ? amount : undefined
            })()
      },
      service: service || initialData?.service || 'uae-to-pinas'
    }

    onNext(senderData)
  }

  return (
    <div className="space-y-6">
      {/* Sub-Header with Route Badge */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onBack}
              className="flex items-center gap-1 sm:gap-2 text-gray-700 hover:text-gray-900 transition-colors min-h-[44px] px-2 sm:px-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="flex-1 flex justify-center min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 bg-green-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-full">
                <span className="text-xs sm:text-sm font-semibold truncate">{routeDisplay}</span>
                <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-600 font-medium hidden xs:block whitespace-nowrap">
              Step 2 of 6
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 pb-6 sm:pb-8">
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 lg:space-y-8">
          {/* Title Section */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">Sender Details</h1>
              <p className="text-gray-600 text-sm sm:text-base">Provide your sender details.</p>
            </div>
            <p className="text-xs sm:text-sm text-gray-500">Required fields (*)</p>
          </div>

          {/* Personal Information */}
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    // Only allow letters and spaces
                    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '')
                    setFirstName(value)
                    if (touched.firstName) {
                      validateField('firstName', value)
                    }
                  }}
                  onBlur={() => handleBlur('firstName', firstName)}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-base min-h-[44px] ${
                    touched.firstName && validationErrors.firstName
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-green-500'
                  }`}
                  placeholder="Enter your first name"
                  required
                  maxLength={50}
                />
                <p className="mt-1 text-xs text-gray-500">Format: Letters only, 2-50 characters</p>
                {touched.firstName && validationErrors.firstName && (
                  <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{validationErrors.firstName}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    // Only allow letters and spaces
                    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '')
                    setLastName(value)
                    if (touched.lastName) {
                      validateField('lastName', value)
                    }
                  }}
                  onBlur={() => handleBlur('lastName', lastName)}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-base min-h-[44px] ${
                    touched.lastName && validationErrors.lastName
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-green-500'
                  }`}
                  placeholder="Enter your last name"
                  required
                  maxLength={50}
                />
                <p className="mt-1 text-xs text-gray-500">Format: Letters only, 2-50 characters</p>
                {touched.lastName && validationErrors.lastName && (
                  <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{validationErrors.lastName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Address Information</h2>
            
            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <img 
                  src={isPhToUae ? '/PH.png' : '/UAE.jpg'} 
                  alt={isPhToUae ? 'Philippines Flag' : 'UAE Flag'} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-6 h-4 object-cover rounded z-10"
                />
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-8 sm:pr-10 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white text-gray-700 text-base min-h-[44px]"
                  required
                >
                  <option value={isPhToUae ? 'PHILIPPINES' : 'UNITED ARAB EMIRATES'}>
                    {isPhToUae ? 'PHILIPPINES' : 'UNITED ARAB EMIRATES'}
                  </option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
              </div>
            </div>

            {/* Address Line 1 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 1 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={addressLine1}
                onChange={(e) => {
                  setAddressLine1(e.target.value)
                  if (touched.addressLine1) {
                    validateField('addressLine1', e.target.value)
                  }
                }}
                onBlur={() => handleBlur('addressLine1', addressLine1)}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-base min-h-[44px] ${
                  touched.addressLine1 && validationErrors.addressLine1
                    ? 'border-red-500'
                    : 'border-gray-300'
                }`}
                placeholder="Flat/Villa No., Building, Street & Area"
                maxLength={200}
                required
              />
              <p className="mt-1 text-xs text-gray-500">Detailed address information (max 200 characters)</p>
              {touched.addressLine1 && validationErrors.addressLine1 && (
                <p className="mt-1 text-xs text-red-500">
                  <span>{validationErrors.addressLine1}</span>
                </p>
              )}
            </div>
          </div>

          {/* Delivery/Pickup Options */}
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Delivery Options</h2>
            <div className="space-y-3">
              <label className="flex items-start sm:items-center gap-3 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 active:bg-gray-100">
                <input
                  type="radio"
                  name="senderDeliveryOption"
                  value="warehouse"
                  checked={senderDeliveryOption === 'warehouse'}
                  onChange={(e) => setSenderDeliveryOption(e.target.value as 'warehouse' | 'pickup')}
                  className="w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500 mt-1 sm:mt-0 flex-shrink-0"
                />
                <div className="flex-1">
                  <span className="font-semibold text-gray-800 block mb-1">Drop Off to Warehouse</span>
                  <p className="text-sm text-gray-600">Drop off your shipment at our warehouse location</p>
                </div>
              </label>
              
              <label className="flex items-start sm:items-center gap-3 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 active:bg-gray-100">
                  <input
                    type="radio"
                    name="senderDeliveryOption"
                    value="pickup"
                    checked={senderDeliveryOption === 'pickup'}
                    onChange={(e) => setSenderDeliveryOption(e.target.value as 'warehouse' | 'pickup')}
                    className="w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500 mt-1 sm:mt-0 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-gray-800 block mb-1">Schedule a Pickup</span>
                    <p className="text-sm text-gray-600">We will pick up your shipment from your location</p>
                  </div>
                </label>
            </div>
          </div>

          {/* Declared Value - Always Required */}
          {!isPhToUae && (
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">Declared Value</h2>
              <div className="space-y-3">
                {/* Shipment Type (Required) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shipment Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-start sm:items-center gap-3 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 active:bg-gray-100">
                      <input
                        type="radio"
                        name="shipmentType"
                        value="document"
                        checked={shipmentType === 'document'}
                        onChange={() => {
                          setShipmentType('document')
                          // Document shipments: not insured, declared value fixed at 0 and not editable
                          setDeclaredAmount('0')
                          setValidationErrors(prev => {
                            const newErrors = { ...prev }
                            delete newErrors.declaredAmount
                            return newErrors
                          })
                        }}
                        className="w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500 mt-1 sm:mt-0 flex-shrink-0"
                      />
                      <div className="flex-1">
                        <span className="font-semibold text-gray-800 block mb-1">Document</span>
                        <p className="text-sm text-gray-600">Declared value will be set to 0</p>
                      </div>
                    </label>

                    <label className="flex items-start sm:items-center gap-3 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 active:bg-gray-100">
                      <input
                        type="radio"
                        name="shipmentType"
                        value="non-document"
                        checked={shipmentType === 'non-document'}
                        onChange={() => {
                          setShipmentType('non-document')
                          // If we previously forced 0 for Document, clear so user must enter a value
                          if (declaredAmount === '0') {
                            setDeclaredAmount('')
                          }
                        }}
                        className="w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500 mt-1 sm:mt-0 flex-shrink-0"
                      />
                      <div className="flex-1">
                        <span className="font-semibold text-gray-800 block mb-1">Non-Document</span>
                        <p className="text-sm text-gray-600">Declared value is required</p>
                      </div>
                    </label>
                  </div>

                  {touched.shipmentType && validationErrors.shipmentType && (
                    <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{validationErrors.shipmentType}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Declared Value <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={declaredAmount}
                    onChange={(e) => {
                      const value = e.target.value
                      // Allow empty string for editing, but validate on blur/submit
                      if (value === '') {
                        setDeclaredAmount('')
                        if (touched.declaredAmount) {
                          validateField('declaredAmount', value)
                        }
                      } else {
                        // Check if it's a valid number
                        const numValue = parseFloat(value)
                        if (!isNaN(numValue)) {
                          // Allow the value to be set, validation will catch <= 0
                          setDeclaredAmount(value)
                          // Validate immediately if field has been touched to give real-time feedback
                          if (touched.declaredAmount) {
                            validateField('declaredAmount', value)
                          }
                        }
                        // If invalid number format, don't update (user is typing/deleting)
                      }
                    }}
                    onBlur={() => handleBlur('declaredAmount', declaredAmount)}
                    disabled={shipmentType === 'document'}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-base min-h-[44px] ${
                      touched.declaredAmount && validationErrors.declaredAmount
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-green-500'
                    } ${shipmentType === 'document' ? 'bg-gray-100 cursor-not-allowed text-gray-600' : ''}`}
                    placeholder="Enter declared value (e.g., 1000)"
                    min={shipmentType === 'document' ? '0' : '0.01'}
                    step="0.01"
                    required={shipmentType === 'non-document'}
                  />
                  <p className="mt-1 text-xs text-gray-500">Enter the declared value of your shipment in AED (must be greater than 0)</p>
                  {shipmentType === 'non-document' && touched.declaredAmount && validationErrors.declaredAmount && (
                    <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{validationErrors.declaredAmount}</span>
                    </div>
                  )}
                </div>
                
                {/* Disclaimer */}
                {shipmentType === 'non-document' && (
                  <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-4 sm:p-5 mt-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-bold text-red-600 mb-3 flex items-center gap-2">
                          <span>Disclaimer:</span>
                        </h3>
                        <p className="text-sm sm:text-base text-red-600 leading-relaxed font-medium">
                          The declared value provided by the client is for insurance purposes only. Any refund or claim is subject to the Company's Terms and Conditions and requires valid proof of purchase (receipt or invoice). Approval and claim amount will depend on policy evaluation.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dial Code <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <img 
                    src={isPhToUae ? '/PH.png' : '/UAE.jpg'} 
                    alt={isPhToUae ? 'Philippines Flag' : 'UAE Flag'} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-6 h-4 object-cover rounded z-10"
                  />
                  <select
                    value={dialCode}
                    onChange={(e) => setDialCode(e.target.value)}
                    disabled={isPhToUae}
                    className={`w-full pl-10 sm:pl-12 pr-8 sm:pr-10 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white text-gray-700 text-base min-h-[44px] ${
                      isPhToUae ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    required
                  >
                    <option value="+971">+971</option>
                    <option value="+63">+63</option>
                  </select>
                  <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none z-10 ${
                    isPhToUae ? 'text-gray-300' : 'text-gray-400'
                  }`} />
                </div>
                {isPhToUae && (
                  <p className="mt-1 text-xs text-gray-500">Dial code is fixed for Philippines</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    // Only allow numbers
                    const value = e.target.value.replace(/[^0-9]/g, '')
                    setPhoneNumber(value)
                    if (touched.phoneNumber) {
                      validateField('phoneNumber', value)
                    }
                  }}
                  onBlur={() => handleBlur('phoneNumber', phoneNumber)}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-base text-black min-h-[44px] ${
                    touched.phoneNumber && validationErrors.phoneNumber
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-green-500'
                  }`}
                  placeholder={dialCode === '+971' ? '501234567' : '9123456789'}
                  required
                  maxLength={15}
                />
                <p className="mt-1 text-xs text-gray-500">Format: {dialCode === '+971' ? '9 digits (e.g., 501234567)' : '10 digits (e.g., 9123456789)'}</p>
                {touched.phoneNumber && validationErrors.phoneNumber && (
                  <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{validationErrors.phoneNumber}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Email Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => {
                  setEmailAddress(e.target.value)
                  if (touched.emailAddress) {
                    validateField('emailAddress', e.target.value)
                  }
                }}
                onBlur={() => handleBlur('emailAddress', emailAddress)}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-base min-h-[44px] ${
                  touched.emailAddress && validationErrors.emailAddress
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-green-500'
                }`}
                placeholder="your.email@example.com (optional)"
              />
              <p className="mt-1 text-xs text-gray-500">Optional: Valid email address (e.g., name@domain.com)</p>
              {touched.emailAddress && validationErrors.emailAddress && (
                <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{validationErrors.emailAddress}</span>
                </div>
              )}
            </div>
            
            {/* Agent Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => {
                  setAgentName(e.target.value)
                  if (touched.agentName) {
                    validateField('agentName', e.target.value)
                  }
                }}
                onBlur={() => handleBlur('agentName', agentName)}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-base min-h-[44px] ${
                  touched.agentName && validationErrors.agentName
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-green-500'
                }`}
                placeholder="Agent or representative name"
                required
              />
              {touched.agentName && validationErrors.agentName && (
                <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{validationErrors.agentName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Next Step Button */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 sm:pt-6">
            <button
              type="submit"
              className="flex items-center justify-center gap-2 bg-green-700 text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg font-semibold hover:bg-green-800 active:bg-green-900 transition-colors text-base sm:text-lg w-full sm:w-auto min-h-[48px] shadow-md hover:shadow-lg"
            >
              <span>Next Step</span>
              <ArrowRight className="w-5 h-5 flex-shrink-0" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
