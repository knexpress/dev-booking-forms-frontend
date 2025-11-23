import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ArrowLeft, ArrowRight, Plane, ChevronDown, AlertCircle } from 'lucide-react'
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
  const [formFillerLatitude, setFormFillerLatitude] = useState<number | null>(null)
  const [formFillerLongitude, setFormFillerLongitude] = useState<number | null>(null)
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false)
  const [senderDeliveryOption, setSenderDeliveryOption] = useState<'warehouse' | 'pickup'>('warehouse')

  // Function to get user's location using browser geolocation API
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser. Please use a modern browser like Chrome.')
      return
    }

    setIsGettingLocation(true)
    setLocationError(null)

    // Use watchPosition for better accuracy, then clear after first good reading
    let watchId: number | null = null
    let attempts = 0
    const maxAttempts = 3
    const accuracyThreshold = 100 // Accept accuracy better than 100 meters

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        attempts++
        const accuracy = position.coords.accuracy
        
        console.log(`Location attempt ${attempts}:`, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: accuracy,
          accuracyInMeters: `${Math.round(accuracy)}m`
        })

        // Accept if accuracy is good, or if we've tried multiple times
        if (accuracy <= accuracyThreshold || attempts >= maxAttempts) {
          if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId)
          }
          
          setFormFillerLatitude(position.coords.latitude)
          setFormFillerLongitude(position.coords.longitude)
          setLocationAccuracy(position.coords.accuracy)
          setLocationPermissionGranted(true)
          setIsGettingLocation(false)
          setLocationError(null)
          
          // Show warning if accuracy is still poor after multiple attempts
          if (accuracy > 1000) {
            setLocationError('Location accuracy is low. For better results, enable GPS on your device and ensure you have a good signal. You can retry to get a more accurate location.')
          }
        }
      },
      (error) => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId)
        }
        
        setIsGettingLocation(false)
        let errorMessage = 'Failed to get your location. '
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location access was denied. Please allow location access in your browser settings and try again.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable. Please check your device settings and ensure GPS is enabled.'
            break
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again. Make sure GPS is enabled on your device.'
            break
          default:
            errorMessage += 'An unknown error occurred. Please try again.'
            break
        }
        
        setLocationError(errorMessage)
        console.error('Geolocation error:', error)
      },
      {
        enableHighAccuracy: true,  // Request GPS-level accuracy
        timeout: 15000,             // Increased timeout for GPS
        maximumAge: 0                // Don't use cached location
      }
    )

    // Fallback timeout - if watchPosition doesn't work, try getCurrentPosition
    setTimeout(() => {
      if (isGettingLocation && watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
        
        // Fallback to getCurrentPosition
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setFormFillerLatitude(position.coords.latitude)
            setFormFillerLongitude(position.coords.longitude)
            setLocationAccuracy(position.coords.accuracy)
            setLocationPermissionGranted(true)
            setIsGettingLocation(false)
            
            if (position.coords.accuracy > 1000) {
              setLocationError('Location captured but accuracy is low. For better results, enable GPS on your device. You can retry to get a more accurate location.')
            }
          },
          (error) => {
            setIsGettingLocation(false)
            setLocationError('Unable to get accurate location. Please ensure GPS is enabled and try again.')
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        )
      }
    }, 20000) // 20 second fallback
  }

  // Ensure PH to UAE route always uses warehouse (no pickup available)
  useEffect(() => {
    if (isPhToUae && senderDeliveryOption === 'pickup') {
      setSenderDeliveryOption('warehouse')
    }
  }, [isPhToUae, senderDeliveryOption])

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
      if (initialData.sender.formFillerLatitude) {
        setFormFillerLatitude(initialData.sender.formFillerLatitude)
        setLocationPermissionGranted(true)
      }
      if (initialData.sender.formFillerLongitude) {
        setFormFillerLongitude(initialData.sender.formFillerLongitude)
      }
      // Set delivery option if exists
      if (initialData.sender.deliveryOption) {
        setSenderDeliveryOption(initialData.sender.deliveryOption)
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
      { name: 'addressLine1', value: addressLine1 }
    ]

    // Validate location is captured
    if (!formFillerLatitude || !formFillerLongitude) {
      setLocationError('Please allow location access to capture your physical address.')
      return
    }

    let isValid = true
    fieldValidations.forEach(({ name, value }) => {
      setTouched(prev => ({ ...prev, [name]: true }))
      if (!validateField(name, value)) {
        isValid = false
      }
    })
    
    // Validate email if provided (optional field)
    if (emailAddress && emailAddress.trim() !== '') {
      setTouched(prev => ({ ...prev, emailAddress: true }))
      if (!validateField('emailAddress', emailAddress)) {
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
        formFillerLatitude: formFillerLatitude || undefined,
        formFillerLongitude: formFillerLongitude || undefined,
        deliveryOption: isPhToUae ? 'warehouse' : senderDeliveryOption // Force warehouse for PH to UAE
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
              
              {!isPhToUae && (
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
              )}
            </div>
          </div>

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
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-base min-h-[44px] ${
                    touched.phoneNumber && validationErrors.phoneNumber
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-green-500'
                  }`}
                  placeholder="501234567"
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
            
            {/* Agent Name (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Name (Optional)
              </label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-base min-h-[44px]"
                placeholder="Agent or representative name"
              />
              <p className="mt-1 text-xs text-gray-500">Optional: Name of agent or representative if applicable</p>
            </div>
            
            {/* Form Filler Location (Geolocation) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Form Filler Location <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {!locationPermissionGranted ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={isGettingLocation}
                      className={`w-full px-4 py-3 border-2 rounded-lg font-semibold transition-all text-base min-h-[48px] flex items-center justify-center gap-2 ${
                        isGettingLocation
                          ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700'
                      }`}
                    >
                      {isGettingLocation ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Getting Location...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Allow Location Access
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-500">
                      Click the button above to allow the browser to access your location. This will capture your latitude and longitude coordinates.
                    </p>
                    {locationError && (
                      <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-700">{locationError}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-green-800 mb-2">Location Captured Successfully</p>
                        <div className="space-y-1 mb-2">
                          <p className="text-xs text-green-700">
                            <span className="font-semibold">Latitude:</span> <span className="font-mono">{formFillerLatitude?.toFixed(6)}</span>
                          </p>
                          <p className="text-xs text-green-700">
                            <span className="font-semibold">Longitude:</span> <span className="font-mono">{formFillerLongitude?.toFixed(6)}</span>
                          </p>
                          {locationAccuracy !== null && (
                            <div className="space-y-1">
                              <p className="text-xs text-green-700">
                                <span className="font-semibold">Accuracy:</span> ±{Math.round(locationAccuracy)} meters
                                {locationAccuracy <= 10 && (
                                  <span className="ml-1 text-green-600 font-semibold">(High Accuracy ✓)</span>
                                )}
                                {locationAccuracy > 10 && locationAccuracy <= 50 && (
                                  <span className="ml-1 text-yellow-600 font-semibold">(Moderate Accuracy)</span>
                                )}
                                {locationAccuracy > 50 && locationAccuracy <= 1000 && (
                                  <span className="ml-1 text-orange-600 font-semibold">(Low Accuracy - Consider retrying)</span>
                                )}
                              </p>
                              {locationAccuracy > 1000 && (
                                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-2 rounded mt-2">
                                  <p className="text-xs text-yellow-800">
                                    <strong>Tip:</strong> For better accuracy, enable GPS on your device, go outside, and ensure you have a good signal. Then click "Update Location" to retry.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${formFillerLatitude},${formFillerLongitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          Verify Location on Google Maps
                        </a>
                        <button
                          type="button"
                          onClick={getCurrentLocation}
                          disabled={isGettingLocation}
                          className="block mt-2 text-xs text-green-700 hover:text-green-800 underline"
                        >
                          {isGettingLocation ? 'Updating...' : 'Update Location'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
