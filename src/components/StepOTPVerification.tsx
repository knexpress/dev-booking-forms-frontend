import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Phone, Shield, Clock, RefreshCw } from 'lucide-react'
import { API_CONFIG } from '../config/api.config'

interface StepOTPVerificationProps {
  onNext: (otpData: { phoneNumber: string; otp: string }) => void
  onBack: () => void
  initialPhoneNumber?: string
  isReadOnly?: boolean
}

export default function StepOTPVerification({
  onNext,
  onBack,
  initialPhoneNumber,
  isReadOnly = false,
}: StepOTPVerificationProps) {
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber || '')
  const [otp, setOtp] = useState('')
  const [isGeneratingOTP, setIsGeneratingOTP] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expiresInMinutes, setExpiresInMinutes] = useState<number | null>(null)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [canResend, setCanResend] = useState(false)
  
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const countdownIntervalRef = useRef<number | null>(null)

  // Determine placeholder based on phone number format
  const getPhonePlaceholder = (): string => {
    // Check current phone number first, then initial
    const currentNumber = phoneNumber || initialPhoneNumber || ''
    if (currentNumber.startsWith('+63')) {
      return '+639123456789'
    } else if (currentNumber.startsWith('+971')) {
      return '+971501234567'
    }
    // Default to UAE format if unknown
    return '+971501234567'
  }

  // Format phone number to ensure it has country code
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters except +
    let formatted = value.replace(/[^\d+]/g, '')
    
    // Ensure it starts with +
    if (formatted && !formatted.startsWith('+')) {
      formatted = '+' + formatted
    }
    
    return formatted
  }

  // Handle phone number input
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
    setError(null)
  }

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const newOtp = otp.split('')
    newOtp[index] = value
    const updatedOtp = newOtp.join('')
    setOtp(updatedOtp)
    setError(null)

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits are entered
    if (updatedOtp.length === 6) {
      handleVerifyOTP(updatedOtp)
    }
  }

  // Handle backspace
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  // Handle paste
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length === 6) {
      setOtp(pastedData)
      pastedData.split('').forEach((digit, index) => {
        if (otpInputRefs.current[index]) {
          otpInputRefs.current[index]!.value = digit
        }
      })
      otpInputRefs.current[5]?.focus()
      // Auto-verify after paste
      setTimeout(() => handleVerifyOTP(pastedData), 100)
    }
  }

  // Generate and send OTP
  const handleGenerateOTP = async () => {
    if (!phoneNumber || !phoneNumber.startsWith('+')) {
      setError('Phone number must include country code (e.g., +971501234567)')
      return
    }

    // Validate phone number format (at least + and country code + number)
    if (phoneNumber.length < 8) {
      setError('Please enter a valid phone number with country code')
      return
    }

    setIsGeneratingOTP(true)
    setError(null)

    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/api/otp/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.replace(/\s/g, ''), // Remove spaces
        }),
      })

      const result = await response.json()

      if (result.success) {
        setOtpSent(true)
        setExpiresInMinutes(result.expiresInMinutes || 5)
        setRemainingAttempts(result.maxAttempts || 3)
        setCountdown(60) // 60 seconds cooldown for resend
        setCanResend(false)
        setOtp('') // Clear previous OTP
        // Focus first OTP input
        otpInputRefs.current[0]?.focus()
        
        // Start countdown timer
        startCountdown()
      } else {
        setError(result.error || 'Failed to send OTP. Please try again.')
      }
    } catch (error) {
      setError('Failed to send OTP. Please check your connection and try again.')
    } finally {
      setIsGeneratingOTP(false)
    }
  }

  // Start countdown timer for resend
  const startCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }

    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          setCanResend(true)
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
            countdownIntervalRef.current = null
          }
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  // Verify OTP and proceed
  const handleVerifyOTP = async (otpToVerify?: string) => {
    const otpValue = otpToVerify || otp

    if (!otpValue || otpValue.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }

    if (!phoneNumber) {
      setError('Phone number is required')
      return
    }

    setIsVerifying(true)
    setError(null)

    // Call onNext with OTP data - backend will verify during booking submission
    onNext({
      phoneNumber: phoneNumber.replace(/\s/g, ''),
      otp: otpValue,
    })
  }

  // Handle resend OTP
  const handleResendOTP = async () => {
    if (!canResend) return
    setOtp('')
    setOtpSent(false)
    setError(null)
    await handleGenerateOTP()
  }

  // Update phone number when initialPhoneNumber prop changes
  useEffect(() => {
    if (initialPhoneNumber) {
      setPhoneNumber(initialPhoneNumber)
    }
  }, [initialPhoneNumber])

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [])

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            OTP Verification
          </h2>
          <p className="text-gray-600">
            Please verify your phone number to complete your booking
          </p>
        </div>

        {/* Phone Number Input Section */}
        {!otpSent ? (
          <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 mb-6">
            <div className="mb-6">
              <label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  placeholder={getPhonePlaceholder()}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isGeneratingOTP || isReadOnly}
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerateOTP}
              disabled={isGeneratingOTP || !phoneNumber || !phoneNumber.startsWith('+')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGeneratingOTP ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Sending OTP...</span>
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5" />
                  <span>Send OTP</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* OTP Input Section */
          <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 mb-6">
            <div className="text-center mb-6">
              <p className="text-gray-700 mb-2">
                OTP sent to <span className="font-semibold">{phoneNumber}</span>
              </p>
              {expiresInMinutes && (
                <p className="text-sm text-gray-500">
                  Valid for {expiresInMinutes} minutes
                </p>
              )}
              {remainingAttempts !== null && (
                <p className="text-sm text-gray-500 mt-1">
                  {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-4 text-center">
                Enter 6-Digit OTP
              </label>
              <div className="flex justify-center gap-2 sm:gap-3 mb-4">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[index] || ''}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold text-black border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isVerifying}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleVerifyOTP()}
                disabled={isVerifying || otp.length !== 6}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    <span>Verify & Continue</span>
                  </>
                )}
              </button>

              <button
                onClick={handleResendOTP}
                disabled={!canResend || isGeneratingOTP}
                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {canResend ? (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>Resend OTP</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5" />
                    <span>Resend in {countdown}s</span>
                  </>
                )}
              </button>
            </div>

            {!isReadOnly && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setOtpSent(false)
                    setOtp('')
                    setError(null)
                    setCountdown(null)
                    setCanResend(false)
                    if (countdownIntervalRef.current) {
                      clearInterval(countdownIntervalRef.current)
                      countdownIntervalRef.current = null
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Change Phone Number
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4 mt-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        </div>
      </div>
    </div>
  )
}

