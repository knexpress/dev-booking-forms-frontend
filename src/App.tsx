import { useState } from 'react'
import { BookingFormData, VerificationData, Step, ItemDeclaration } from './types'
import Header from './components/Header'
import Footer from './components/Footer'
import LandingPage from './components/LandingPage'
import ServiceSelection from './components/ServiceSelection'
import Step1BookingForm from './components/Step1BookingForm'
import ReceiverDetailsForm from './components/ReceiverDetailsForm'
import CommoditiesDeclaration from './components/CommoditiesDeclaration'
import Step2EmiratesIDScan from './components/Step2EmiratesIDScan'
import Step3FaceScan from './components/Step3FaceScan'
import StepOTPVerification from './components/StepOTPVerification'
import BookingConfirmation from './components/BookingConfirmation'
import ToastContainer, { showToast } from './components/ToastContainer'
import { generateBookingPDF } from './utils/pdfGenerator'
import ErrorBoundary from './components/ErrorBoundary'
import LoadingOverlay from './components/LoadingOverlay'
import { API_CONFIG } from './config/api.config'
import { CheckCircle, Printer } from 'lucide-react'

function App() {

  const [currentStep, setCurrentStep] = useState<Step>(-1 as Step) // Start at -1 for landing page
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [bookingData, setBookingData] = useState<BookingFormData | null>(null)
  const [verificationData, setVerificationData] = useState<VerificationData>({
    eidVerified: false,
    faceVerified: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Loading...')
  const [capturedLocation, setCapturedLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null)
  const [showBookingSuccessPopup, setShowBookingSuccessPopup] = useState(false)
  const [bookingSuccessData, setBookingSuccessData] = useState<{
    referenceNumber: string;
    bookingId: string;
  } | null>(null)
  const [otpData, setOtpData] = useState<{
    phoneNumber: string;
    otp: string;
  } | null>(null)

  const navigateToStep = (step: Step, message: string = 'Loading...') => {
    setIsLoading(true)
    setLoadingMessage(message)
    // Small delay to show loading animation, then navigate
    setTimeout(() => {
      setCurrentStep(step)
      // Hide loading after a brief moment to allow component to render
      setTimeout(() => {
        setIsLoading(false)
      }, 100)
    }, 300)
  }

  const captureUserLocation = (): Promise<{ latitude: number; longitude: number; accuracy: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
          setCapturedLocation(location)
          console.log('Location captured automatically:', location)
          resolve(location)
        },
        (error) => {
          console.error('Geolocation error:', error)
          // Don't reject - allow user to continue and capture manually later
          // Just log the error and proceed
          reject(error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    })
  }

  const handleBookShipment = async () => {
    // Automatically capture location when user clicks "Book Shipment"
    try {
      await captureUserLocation()
    } catch (error) {
      // Location capture failed, but allow user to continue
      // They can capture it manually in Step1BookingForm
      console.warn('Automatic location capture failed, user can capture manually:', error)
    }
    navigateToStep(0, 'Preparing booking form...')
  }

  const handleServiceSelection = (service: string) => {
    setSelectedService(service)
    navigateToStep(1, 'Loading sender details form...')
  }

  const handleSenderDetailsNext = (senderData: Partial<BookingFormData>) => {
    setBookingData(prev => ({
      ...prev,
      ...senderData,
      service: selectedService || senderData.service || 'uae-to-pinas'
    } as BookingFormData))
    navigateToStep(2, 'Loading receiver details form...')
  }

  const handleReceiverDetailsNext = (receiverData: Partial<BookingFormData>) => {
    setBookingData(prev => ({
      ...prev,
      ...receiverData,
      service: selectedService || prev?.service || 'uae-to-pinas',
      items: prev?.items || []
    } as BookingFormData))
    navigateToStep(3, 'Loading commodities declaration...')
  }

  const handleCommoditiesNext = (items: ItemDeclaration[]) => {
    setBookingData(prev => ({
      ...prev,
      items
    } as BookingFormData))
    navigateToStep(5, 'Preparing ID scan...')
  }

  const handleStep2Complete = (eidData: Partial<VerificationData>) => {
    setVerificationData(prev => ({ ...prev, ...eidData, eidVerified: true }))
    navigateToStep(6, 'Preparing face scan...')
  }

  const handleStep3Complete = (faceData: Partial<VerificationData>) => {
    setVerificationData(prev => ({ ...prev, ...faceData, faceVerified: true }))
    navigateToStep(6.5 as Step, 'Preparing OTP verification...')
  }

  const handleOTPComplete = (otpData: { phoneNumber: string; otp: string }) => {
    setOtpData(otpData)
    
    // If we have booking data, proceed to confirmation
    // Otherwise, this is a test from landing page - just show success message
    if (bookingData) {
    navigateToStep(7, 'Loading confirmation...')
    } else {
      // Test mode - show success and reset
      showToast({
        type: 'success',
        message: `OTP verified successfully! Phone: ${otpData.phoneNumber}`,
        duration: 5000,
      })
      // Reset and go back to landing page after a delay
      setTimeout(() => {
        setOtpData(null)
        setCurrentStep(-1 as Step)
      }, 2000)
    }
  }

  const handleFinalSubmit = async () => {
    setIsLoading(true)
    setLoadingMessage('Submitting your booking...')
    
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
      eidFrontImageFirstName: eidFrontImageFirstName, // First name of person whose EID is being sent
      eidFrontImageLastName: eidFrontImageLastName, // Last name of person whose EID is being sent
      eidBackImage: verificationData.eidBackImage,
      philippinesIdFront: verificationData.philippinesIdFront, // Philippines ID Front (for Philippines to UAE route)
      philippinesIdBack: verificationData.philippinesIdBack, // Philippines ID Back (for Philippines to UAE route)
      customerImage: verificationData.faceImage, // Keep for backward compatibility (first image)
      customerImages: verificationData.faceImages || (verificationData.faceImage ? [verificationData.faceImage] : []), // All face images
      termsAccepted: true,
      submissionTimestamp: new Date().toISOString(),
      // OTP fields
      otpPhoneNumber: otpData?.phoneNumber || '',
      otp: otpData?.otp || '',
    }
    
    console.log('📦 Submitting Booking Data:', finalData)
    console.log('📍 Form Filler Location:', {
      latitude: finalData.sender?.formFillerLatitude,
      longitude: finalData.sender?.formFillerLongitude
    })
    console.log('🌐 API Base URL:', API_CONFIG.baseUrl)
    
    // Check if API URL is configured correctly
    if (API_CONFIG.baseUrl === 'http://localhost:5000' && window.location.hostname !== 'localhost') {
      console.error('❌ API URL not configured! Using default localhost in production.')
      setIsLoading(false)
      showToast({
        type: 'error',
        message: 'API configuration error. Please set VITE_API_BASE_URL environment variable.',
        duration: 5000,
      })
      return
    }
    
    try {
      // Call API endpoint to save booking
      const apiUrl = `${API_CONFIG.baseUrl}/api/bookings`
      console.log('📡 Calling API:', apiUrl)
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
      })
      
      // Check if response is ok (status 200-299)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ HTTP Error:', response.status, response.statusText)
        console.error('❌ Error Response:', errorText)
        setIsLoading(false)
        showToast({
          type: 'error',
          message: `Failed to submit booking: ${response.status} ${response.statusText}. Please check if the API URL is correct.`,
          duration: 5000,
        })
        return
      }
      
      const result = await response.json()
      
      setIsLoading(false)
      
      if (result.success) {
        console.log('✅ Booking saved successfully!')
        console.log('   Reference Number:', result.referenceNumber)
        console.log('   Booking ID:', result.bookingId)
        
        // Show success popup with print option
        setBookingSuccessData({
                referenceNumber: result.referenceNumber,
                bookingId: result.bookingId,
        })
        setShowBookingSuccessPopup(true)
      } else {
        console.error('❌ Booking failed:', result.error)
        
        // Check if it's an OTP-related error
        const errorMessage = result.error || ''
        const isOTPError = errorMessage.toLowerCase().includes('otp') || 
                          errorMessage.toLowerCase().includes('expired') ||
                          errorMessage.toLowerCase().includes('invalid') ||
                          errorMessage.toLowerCase().includes('attempts')
        
        if (isOTPError) {
          // Go back to OTP step for OTP-related errors
              showToast({
                type: 'error',
            message: errorMessage,
            duration: 5000,
              })
          // Reset OTP data and go back to OTP step
          setOtpData(null)
          navigateToStep(6.5 as Step, 'Please verify OTP again...')
      } else {
        showToast({
          type: 'error',
            message: `Failed to submit booking: ${errorMessage}`,
          duration: 5000,
        })
        }
      }
    } catch (error) {
      setIsLoading(false)
      console.error('❌ Network error:', error)
      showToast({
        type: 'error',
        message: 'Network error. Please check your connection and try again.',
        duration: 5000,
      })
    }
  }

  const handlePrintBookingForm = async () => {
    console.log('🖨️ Print button clicked')
    console.log('📋 bookingSuccessData:', bookingSuccessData)
    console.log('📋 bookingData:', bookingData)
    console.log('📋 selectedService:', selectedService)
    console.log('📋 verificationData:', verificationData)
    
    if (!bookingSuccessData) {
      console.error('❌ No bookingSuccessData available')
      showToast({
        type: 'error',
        message: 'Booking reference data not available. Please try again.',
        duration: 3000,
      })
      return
    }
    
    if (!bookingData) {
      console.error('❌ No bookingData available')
      showToast({
        type: 'error',
        message: 'Booking data not available. Please try again.',
        duration: 3000,
      })
      return
    }
    
    // Detect iOS Safari for special handling
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isIOSSafari = isIOS && isSafari
    
    if (isIOSSafari) {
      // Show loading message for iOS Safari users
      showToast({
        type: 'success',
        message: 'Generating PDF... Please wait.',
        duration: 3000,
      })
    }
    
    try {
      console.log('📄 Starting PDF generation...')
      const pdfData = {
        referenceNumber: bookingSuccessData.referenceNumber,
        bookingId: bookingSuccessData.bookingId,
        service: selectedService || 'uae-to-pinas',
        sender: bookingData.sender,
        receiver: {
          ...bookingData.receiver,
          deliveryOption: (bookingData.receiver.deliveryOption === 'pickup' ? 'warehouse' : 'address') as 'warehouse' | 'address',
        },
        items: bookingData.items,
        eidFrontImage: verificationData.eidFrontImage,
        eidBackImage: verificationData.eidBackImage,
        philippinesIdFront: verificationData.philippinesIdFront,
        philippinesIdBack: verificationData.philippinesIdBack,
        customerImage: verificationData.faceImage,
        customerImages: verificationData.faceImages || (verificationData.faceImage ? [verificationData.faceImage] : []),
        submissionTimestamp: new Date().toISOString(),
        declarationText: 'By proceeding with this shipment, I declare that the contents of my shipment do not contain any prohibited, illegal, or restricted items under international or local laws. I fully understand that shipping illegal goods constitutes a criminal offense and is punishable by law. I acknowledge that KNEX Delivery Services acts solely as a carrier and shall not be held responsible for the nature, condition, or contents of the shipment. I further acknowledge that I have allowed the system to access my location through the browser\'s geolocation service, and I understand that my latitude and longitude coordinates have been captured for verification and communication purposes related to this booking.',
      }
      
      console.log('📄 PDF Data:', pdfData)
      
      await generateBookingPDF(pdfData)
      console.log('✅ PDF generated successfully')
      
      if (isIOSSafari) {
        showToast({
          type: 'success',
          message: 'PDF ready! If it didn\'t open automatically, tap the blue button on screen.',
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('❌ Error generating PDF:', error)
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      showToast({
        type: 'error',
        message: `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the console for details.`,
        duration: 5000,
      })
    }
  }

  const handleCloseBookingSuccessPopup = () => {
    setShowBookingSuccessPopup(false)
    setBookingSuccessData(null)
    // Reset flow back to landing page
    setSelectedService(null)
    setBookingData(null)
    setVerificationData({ eidVerified: false, faceVerified: false })
    setCapturedLocation(null)
    setCurrentStep(-1 as Step)
  }

  const handleBack = () => {
    // Going back logic
    if (currentStep === 7) {
      navigateToStep(6.5 as Step, 'Going back...')
    } else if (currentStep === 6.5) {
      // If we have booking data, go back to face scan, otherwise go to landing page
      if (bookingData) {
      navigateToStep(6, 'Going back...')
      } else {
        // Came from landing page test button, go back to landing
        setCurrentStep(-1 as Step)
      }
    } else if (currentStep === 6) {
      navigateToStep(5, 'Going back...')
    } else if (currentStep === 5) {
      navigateToStep(3, 'Going back...')
    } else if (currentStep === 3) {
      navigateToStep(2, 'Going back...')
    } else if (currentStep === 2) {
      navigateToStep(1, 'Going back...')
    } else if (currentStep === 1) {
      navigateToStep(0 as Step, 'Going back...')
    } else if (currentStep === 0) {
      // Reset captured location when going back to landing page
      setCapturedLocation(null)
      navigateToStep(-1 as Step, 'Going back...')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <LoadingOverlay isVisible={isLoading} message={loadingMessage} />
      <ToastContainer />
      <Header onBookNow={currentStep === -1 ? undefined : handleBookShipment} />
      {currentStep === -1 ? (
        <ErrorBoundary>
          <LandingPage 
            onBookShipment={handleBookShipment}
          />
        </ErrorBoundary>
      ) : (
        <div className="flex-1 py-8 px-4">
          <div className="max-w-7xl mx-auto">
            
            {/* Progress Indicator - Only show after route selection */}
            {currentStep > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-3">
                    {/* Step 1: Booking Form */}
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs ${
                        currentStep === 1 ? 'border-primary-600 bg-primary-600 text-white' : 
                        currentStep > 1 ? 'border-green-500 bg-green-500 text-white' : 
                        'border-gray-300 bg-white text-gray-400'
                      }`}>
                        {currentStep > 1 ? '✓' : '1'}
                      </div>
                      <span className={`ml-1 text-xs font-medium hidden sm:inline ${
                        currentStep === 1 ? 'text-primary-600' : 
                        currentStep > 1 ? 'text-green-600' : 
                        'text-gray-400'
                      }`}>
                        Form
                      </span>
                    </div>
                    
                    {/* Connector */}
                    <div className={`h-0.5 w-8 ${currentStep > 1 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    
                    {/* Step 2: Emirates ID */}
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs ${
                        currentStep === 2 ? 'border-primary-600 bg-primary-600 text-white' : 
                        currentStep > 2 ? 'border-green-500 bg-green-500 text-white' : 
                        'border-gray-300 bg-white text-gray-400'
                      }`}>
                        {currentStep > 2 ? '✓' : '2'}
                      </div>
                      <span className={`ml-1 text-xs font-medium hidden sm:inline ${
                        currentStep === 2 ? 'text-primary-600' : 
                        currentStep > 2 ? 'text-green-600' : 
                        'text-gray-400'
                      }`}>
                        ID Scan
                      </span>
                    </div>

                    {/* Connector */}
                    <div className={`h-0.5 w-8 ${currentStep > 2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    
                    {/* Step 3: Face Scan */}
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs ${
                        currentStep === 6 ? 'border-primary-600 bg-primary-600 text-white' : 
                        currentStep > 6 ? 'border-green-500 bg-green-500 text-white' : 
                        'border-gray-300 bg-white text-gray-400'
                      }`}>
                        {currentStep > 6 ? '✓' : '3'}
                      </div>
                      <span className={`ml-1 text-xs font-medium hidden sm:inline ${
                        currentStep === 6 ? 'text-primary-600' : 
                        currentStep > 6 ? 'text-green-600' : 
                        'text-gray-400'
                      }`}>
                        Face Scan
                      </span>
                    </div>

                    {/* Connector */}
                    <div className={`h-0.5 w-8 ${currentStep > 6 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    
                    {/* Step 4: OTP Verification */}
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs ${
                        currentStep === 6.5 ? 'border-primary-600 bg-primary-600 text-white' : 
                        currentStep > 6.5 ? 'border-green-500 bg-green-500 text-white' : 
                        'border-gray-300 bg-white text-gray-400'
                      }`}>
                        {currentStep > 6.5 ? '✓' : '4'}
                      </div>
                      <span className={`ml-1 text-xs font-medium hidden sm:inline ${
                        currentStep === 6.5 ? 'text-primary-600' : 
                        currentStep > 6.5 ? 'text-green-600' : 
                        'text-gray-400'
                      }`}>
                        OTP
                      </span>
                    </div>

                    {/* Connector */}
                    <div className={`h-0.5 w-8 ${currentStep > 6.5 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    
                    {/* Step 5: Submit */}
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs ${
                        currentStep === 7 ? 'border-primary-600 bg-primary-600 text-white' : 
                        'border-gray-300 bg-white text-gray-400'
                      }`}>
                        5
                      </div>
                      <span className={`ml-1 text-xs font-medium hidden sm:inline ${
                        currentStep === 7 ? 'text-primary-600' : 'text-gray-400'
                      }`}>
                        Submit
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <ErrorBoundary>
                {currentStep === 0 && (
                  <ServiceSelection 
                    onSelectService={handleServiceSelection} 
                    onBack={handleBack}
                  />
                )}
                
              {currentStep === 1 && (
                <Step1BookingForm 
                  onNext={handleSenderDetailsNext} 
                  onBack={handleBack}
                  initialData={{
                    ...bookingData,
                    sender: {
                      ...bookingData?.sender,
                      formFillerLatitude: capturedLocation?.latitude || bookingData?.sender?.formFillerLatitude,
                      formFillerLongitude: capturedLocation?.longitude || bookingData?.sender?.formFillerLongitude,
                    }
                  } as BookingFormData | null} 
                  service={selectedService} 
                  preCapturedLocation={capturedLocation}
                />
              )}
                
              {currentStep === 2 && (
                <ReceiverDetailsForm 
                  onNext={handleReceiverDetailsNext} 
                  onBack={handleBack}
                  initialData={bookingData} 
                  service={selectedService} 
                />
              )}
                
              {currentStep === 3 && (
                <CommoditiesDeclaration 
                  onNext={handleCommoditiesNext} 
                  onBack={handleBack}
                  initialData={bookingData} 
                  service={selectedService} 
                />
              )}
              
              {currentStep === 5 && (
                <Step2EmiratesIDScan 
                  onComplete={handleStep2Complete}
                  onBack={handleBack}
                  service={selectedService}
                  bookingData={bookingData}
                />
              )}
                
              {currentStep === 6 && (
                <Step3FaceScan 
                  onComplete={handleStep3Complete}
                  onBack={handleBack}
                  eidImage={verificationData.eidFrontImage}
                  eidBackImage={verificationData.eidBackImage}
                  service={selectedService}
                />
              )}

              {currentStep === 6.5 && (
                <StepOTPVerification
                  onNext={handleOTPComplete}
                  onBack={handleBack}
                  initialPhoneNumber={bookingData?.sender?.contactNo}
                />
              )}
                
              {currentStep === 7 && (
                <BookingConfirmation 
                  onSubmit={handleFinalSubmit}
                  onBack={handleBack}
                  initialData={bookingData}
                  service={selectedService}
                />
              )}
              </ErrorBoundary>
            </div>
          </div>
        </div>
      )}
      <Footer />

      {/* Booking Success Popup Modal */}
      {showBookingSuccessPopup && bookingSuccessData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-4">
              Booking Submitted Successfully!
            </h3>
            <p className="text-gray-700 text-center mb-2">
              Thank you! Your booking has been successfully submitted.
            </p>
            <p className="text-sm text-gray-600 text-center mb-6">
              Reference Number: <span className="font-mono font-semibold text-gray-900">{bookingSuccessData.referenceNumber}</span>
            </p>
            <p className="text-xs text-gray-500 text-center mb-6">
              You will receive a confirmation email shortly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handlePrintBookingForm}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex-1 min-h-[48px]"
              >
                <Printer className="w-5 h-5" />
                Print Booking Form
              </button>
              <button
                type="button"
                onClick={handleCloseBookingSuccessPopup}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 min-h-[48px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
