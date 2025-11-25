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
import BookingConfirmation from './components/BookingConfirmation'
import ToastContainer, { showToast } from './components/ToastContainer'
import { generateBookingPDF } from './utils/pdfGenerator'
import ErrorBoundary from './components/ErrorBoundary'
import LoadingOverlay from './components/LoadingOverlay'
import { API_CONFIG } from './config/api.config'

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
    navigateToStep(7, 'Loading confirmation...')
  }

  const handleFinalSubmit = async () => {
    setIsLoading(true)
    setLoadingMessage('Submitting your booking...')
    
    const finalData = {
      ...bookingData!,
      service: selectedService || 'uae-to-pinas',
      eidFrontImage: verificationData.eidFrontImage,
      eidBackImage: verificationData.eidBackImage,
      philippinesIdFront: verificationData.philippinesIdFront, // Philippines ID Front (for Philippines to UAE route)
      philippinesIdBack: verificationData.philippinesIdBack, // Philippines ID Back (for Philippines to UAE route)
      customerImage: verificationData.faceImage, // Keep for backward compatibility (first image)
      customerImages: verificationData.faceImages || (verificationData.faceImage ? [verificationData.faceImage] : []), // All face images
      termsAccepted: true,
      submissionTimestamp: new Date().toISOString(),
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
        
        // Show success toast with print option
        showToast({
          type: 'success',
          message: 'Thank you! Your booking has been successfully submitted.',
          referenceNumber: result.referenceNumber,
          onPrint: async () => {
            try {
              await generateBookingPDF({
                referenceNumber: result.referenceNumber,
                bookingId: result.bookingId,
                service: selectedService || 'uae-to-pinas',
                sender: finalData.sender,
                receiver: {
                  ...finalData.receiver,
                  deliveryOption: finalData.receiver.deliveryOption === 'pickup' ? 'warehouse' : 'address',
                },
                items: finalData.items,
                eidFrontImage: verificationData.eidFrontImage,
                eidBackImage: verificationData.eidBackImage,
                philippinesIdFront: verificationData.philippinesIdFront,
                philippinesIdBack: verificationData.philippinesIdBack,
                customerImage: verificationData.faceImage, // Single image for backward compatibility
                customerImages: verificationData.faceImages || (verificationData.faceImage ? [verificationData.faceImage] : []), // All face images
                submissionTimestamp: finalData.submissionTimestamp,
                declarationText: 'By proceeding with this shipment, I declare that the contents of my shipment do not contain any prohibited, illegal, or restricted items under international or local laws. I fully understand that shipping illegal goods constitutes a criminal offense and is punishable by law. I acknowledge that KNEX Delivery Services acts solely as a carrier and shall not be held responsible for the nature, condition, or contents of the shipment. I further acknowledge that I have allowed the system to access my location through the browser\'s geolocation service, and I understand that my latitude and longitude coordinates have been captured for verification and communication purposes related to this booking.',
              }, { openInNewTab: true })
            } catch (error) {
              console.error('Error generating PDF:', error)
              showToast({
                type: 'error',
                message: 'Failed to generate PDF. Please try again.',
                duration: 3000,
              })
            }
          },
          duration: 8000, // Show for 8 seconds to give user time to click print
        })

        // After toast duration, reset flow back to landing page
        setTimeout(() => {
          setSelectedService(null)
          setBookingData(null)
          setVerificationData({ eidVerified: false, faceVerified: false })
          setCapturedLocation(null)
          setCurrentStep(-1 as Step)
        }, 8200)
      } else {
        console.error('❌ Booking failed:', result.error)
        showToast({
          type: 'error',
          message: `Failed to submit booking: ${result.error}`,
          duration: 5000,
        })
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

  const handleBack = () => {
    // Going back logic
    if (currentStep === 7) {
      navigateToStep(6, 'Going back...')
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
          <LandingPage onBookShipment={handleBookShipment} />
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
                        currentStep === 3 ? 'border-primary-600 bg-primary-600 text-white' : 
                        currentStep > 3 ? 'border-green-500 bg-green-500 text-white' : 
                        'border-gray-300 bg-white text-gray-400'
                      }`}>
                        {currentStep > 3 ? '✓' : '3'}
                      </div>
                      <span className={`ml-1 text-xs font-medium hidden sm:inline ${
                        currentStep === 3 ? 'text-primary-600' : 
                        currentStep > 3 ? 'text-green-600' : 
                        'text-gray-400'
                      }`}>
                        Face Scan
                      </span>
                    </div>

                    {/* Connector */}
                    <div className={`h-0.5 w-8 ${currentStep > 3 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    
                    {/* Step 4: Submit */}
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs ${
                        currentStep === 4 ? 'border-primary-600 bg-primary-600 text-white' : 
                        'border-gray-300 bg-white text-gray-400'
                      }`}>
                        4
                      </div>
                      <span className={`ml-1 text-xs font-medium hidden sm:inline ${
                        currentStep === 4 ? 'text-primary-600' : 'text-gray-400'
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
    </div>
  )
}

export default App

