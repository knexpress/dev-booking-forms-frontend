import { useState, useRef, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Camera, CheckCircle, XCircle, RotateCcw, ArrowLeft, ArrowRight, Maximize2, Upload } from 'lucide-react'
import { VerificationData, BookingFormData } from '../types'
// OCR validation removed - EID images are accepted without validation
import { showToast } from './ToastContainer'
import {
  loadOpenCV,
  detectDocumentInFrame,
  cropDocument,
  imageToMat,
  matToBase64,
} from '../services/opencvService'
import IDScanModal from './IDScanModal'

interface Step2Props {
  onComplete: (data: Partial<VerificationData>) => void
  onBack: () => void
  service?: string | null
  bookingData?: BookingFormData | null
}

type ScanSide = 'front' | 'back' | null

export default function Step2EmiratesIDScan({ onComplete, onBack, service, bookingData: _bookingData }: Step2Props) {
  // Determine route
  const route = (service || 'uae-to-pinas').toLowerCase()
  const isPhToUae = route === 'ph-to-uae'
  const routeDisplay = isPhToUae ? 'PHILIPPINES TO UAE' : 'UAE TO PHILIPPINES'
  
  // Name variables removed - OCR validation disabled
  // EID images are accepted without validation
  const webcamRef = useRef<Webcam>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const detectionIntervalRef = useRef<number | null>(null)
  const stabilityTimerRef = useRef<number | null>(null)
  
  const [currentSide, setCurrentSide] = useState<ScanSide>(null)
  const [frontImage, setFrontImage] = useState<string | null>(null)
  const [backImage, setBackImage] = useState<string | null>(null)
  const [frontCroppedImage, setFrontCroppedImage] = useState<string | null>(null)
  const [backCroppedImage, setBackCroppedImage] = useState<string | null>(null)
  const [philippinesIdFront, setPhilippinesIdFront] = useState<string | null>(null)
  const [philippinesIdBack, setPhilippinesIdBack] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [_eidData, setEidData] = useState<any>(null)
  const [processingMessage, _setProcessingMessage] = useState<string>('Processing Emirates ID data...')
  const [cameraError, setCameraError] = useState<string | null>(null)
  // File upload removed - camera capture only
  
  // Auto-detection state
  const [opencvLoaded, setOpencvLoaded] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionReady, setDetectionReady] = useState(false)
  const [detectedPoints, setDetectedPoints] = useState<any[] | null>(null)
  const [_stabilityStartTime, setStabilityStartTime] = useState<number | null>(null)
  const [_lastBlurScore, setLastBlurScore] = useState<number>(0)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalSide, setModalSide] = useState<ScanSide>(null)
  // Name mismatch popup removed - OCR validation disabled
  
  // Detect if device is mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768
  
  // Minimum blur score threshold - very low for easier detection
  const MIN_BLUR_SCORE = isMobile ? 15 : 25
  // Stability duration in milliseconds - capture immediately when detected
  const STABILITY_DURATION = 0 // Capture immediately when card is detected
  
  // Ref to track if capture has been triggered (persists across renders)
  const captureTriggeredRef = useRef(false)
  // Ref to track detection start time for delay
  const detectionStartTimeRef = useRef<number | null>(null)
  // Ref to store the delay timeout
  const captureDelayTimeoutRef = useRef<number | null>(null)
  // Ref to store the auto-capture timer (6 seconds after camera opens)
  const autoCaptureTimerRef = useRef<number | null>(null)
  
  // Check if browser supports camera API
  const checkCameraSupport = (): { supported: boolean; error?: string } => {
    if (!navigator.mediaDevices) {
      return {
        supported: false,
        error: 'Camera API is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.'
      }
    }
    
    if (!navigator.mediaDevices.getUserMedia) {
      return {
        supported: false,
        error: 'getUserMedia is not available. Please ensure you are using HTTPS or localhost.'
      }
    }
    
    return { supported: true }
  }
  
  // Close modal function
  const closeScanModal = () => {
    stopAutoDetection()
    setCurrentSide(null)
    setModalSide(null)
    setModalOpen(false)
    // Don't clear cameraError here - let it persist so user knows if there was an issue
  }

  // Load OpenCV on mount
  useEffect(() => {
    loadOpenCV()
      .then(() => {
        setOpencvLoaded(true)
      })
      .catch(() => {
        // Don't set error - OpenCV loading failed but camera can still work
        // Automatic detection will be disabled
      })

    // Check camera support on mount
    const supportCheck = checkCameraSupport()
    if (!supportCheck.supported) {
      // Don't set error immediately - let user try first, then show error if needed
    }

    return () => {
      // Cleanup detection intervals
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
      if (stabilityTimerRef.current) {
        clearTimeout(stabilityTimerRef.current)
      }
    }
  }, [])

  const requestCameraPermission = async () => {
    // Check browser support first
    const supportCheck = checkCameraSupport()
    if (!supportCheck.supported) {
      handleCameraError(new Error(supportCheck.error || 'Camera not supported'))
      return false
    }

    // Helper function to add timeout to getUserMedia
    const getUserMediaWithTimeout = async (constraints: MediaStreamConstraints, timeoutMs: number = 15000): Promise<MediaStream> => {
      return Promise.race([
        navigator.mediaDevices.getUserMedia(constraints),
        new Promise<MediaStream>((_, reject) => {
          setTimeout(() => {
            // Create error with TimeoutError name for proper detection
            const timeoutError = new Error('Timeout starting video source')
            timeoutError.name = 'TimeoutError'
            reject(timeoutError)
          }, timeoutMs)
        })
      ])
    }

    try {
      // Request camera permission explicitly with timeout (15 seconds)
      const stream = await getUserMediaWithTimeout({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      }, 15000)
      
      // Stop the stream immediately - we just needed to request permission
      stream.getTracks().forEach(track => track.stop())
      
      // Clear errors and show success
      setCameraError(null)
      // File upload removed
      
      return true
    } catch (err) {
      
      let errorMessage = 'Camera access denied or not available'
      const errorName = err instanceof Error ? err.name : (err as any)?.name || ''
      const errorMsg = err instanceof Error ? err.message : String(err)
      
      // Check error name first (works for both DOMException and Error)
      if (errorName === 'TimeoutError' || errorName === 'AbortError' || errorMsg.includes('Timeout') || errorMsg.includes('timeout')) {
        errorMessage = 'Camera is taking too long to start. Please try again. Make sure no other app is using the camera.'
      } else if (err instanceof DOMException || errorName) {
        switch (errorName) {
          case 'NotAllowedError':
          case 'PermissionDeniedError':
            errorMessage = 'Camera permission was denied. Please allow camera access in your browser settings and try again.'
            break
          case 'NotFoundError':
          case 'DevicesNotFoundError':
            errorMessage = 'No camera found. Please connect a camera device.'
            break
          case 'NotReadableError':
          case 'TrackStartError':
            errorMessage = 'Camera is already in use by another application. Please close other apps using the camera.'
            break
          case 'OverconstrainedError':
          case 'ConstraintNotSatisfiedError':
            errorMessage = 'Camera constraints could not be satisfied. Trying with default settings...'
            // Try again with simpler constraints and shorter timeout
            try {
              const fallbackStream = await getUserMediaWithTimeout({ video: true }, 10000)
              fallbackStream.getTracks().forEach(track => track.stop())
              setCameraError(null)
              return true
            } catch (fallbackErr) {
              errorMessage = 'Camera access failed. Please try again.'
            }
            break
          case 'NotSupportedError':
            errorMessage = 'Camera is not supported in this browser. Please use a modern browser.'
            break
          default:
            errorMessage = errorMsg || 'Camera access error. Please try again.'
        }
      } else if (err instanceof Error) {
        errorMessage = errorMsg
      }
      
      handleCameraError(new Error(errorMessage))
      return false
    }
  }



  // Draw detected rectangle on canvas
  const drawDetection = useCallback((points: any[] | null, canvas: HTMLCanvasElement, video: HTMLVideoElement, isReady: boolean = false) => {
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match video
    const videoWidth = video.videoWidth || video.clientWidth
    const videoHeight = video.videoHeight || video.clientHeight
    
    if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
      canvas.width = videoWidth
      canvas.height = videoHeight
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (points && points.length >= 4) {
      // Draw detected rectangle
      ctx.strokeStyle = isReady ? '#10b981' : '#eab308' // green or yellow
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      ctx.closePath()
      ctx.stroke()

      // Draw corner markers
      points.forEach((point) => {
        ctx.fillStyle = isReady ? '#10b981' : '#eab308'
        ctx.beginPath()
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI)
        ctx.fill()
      })
    }
  }, [])

  // Stop automatic detection
  const stopAutoDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    if (stabilityTimerRef.current) {
      clearTimeout(stabilityTimerRef.current)
      stabilityTimerRef.current = null
    }
    if (captureDelayTimeoutRef.current) {
      clearTimeout(captureDelayTimeoutRef.current)
      captureDelayTimeoutRef.current = null
    }
    if (autoCaptureTimerRef.current) {
      clearTimeout(autoCaptureTimerRef.current)
      autoCaptureTimerRef.current = null
    }
    setIsDetecting(false)
    setDetectionReady(false)
    setStabilityStartTime(null)
    setDetectedPoints(null)
    setRemainingSeconds(null)
    detectionStartTimeRef.current = null
  }, [])

  // Auto-capture document when conditions are met
  const autoCaptureDocument = useCallback(async (capturePoints: any[], captureSide: ScanSide) => {
    const video = videoRef.current
    
    if (!video) {
      setError('Camera video stream not available')
      setIsProcessing(false)
      return
    }
    
    if (!opencvLoaded) {
      setError('Image processing library not loaded')
      setIsProcessing(false)
      return
    }
    
    if (!capturePoints || capturePoints.length < 4) {
      setError('Invalid document detection points')
      setIsProcessing(false)
      return
    }
    
    if (!captureSide || (captureSide !== 'front' && captureSide !== 'back')) {
      setError(`Invalid capture side: ${captureSide || 'undefined'}. Please try again.`)
      setIsProcessing(false)
      return
    }

    // Stop detection immediately to prevent multiple captures
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    
    setIsDetecting(false)
    setIsProcessing(true)
    setError(null)

    try {
      // Get video frame as Mat - this is the actual capture
      const videoMat = await imageToMat(video)
      if (!videoMat) {
        throw new Error('Failed to capture video frame')
      }

      // Crop the document using the detected rectangle
      const croppedMat = cropDocument(videoMat, capturePoints, 800, 500)
      if (!croppedMat) {
        videoMat.delete()
        throw new Error('Failed to crop document')
      }

      // Convert cropped image to base64 (for validation)
      const croppedBase64 = matToBase64(croppedMat, 'image/jpeg')
      
      // Get original full screenshot for display (shows as-is)
      const originalScreenshot = webcamRef.current?.getScreenshot()

      // Cleanup OpenCV mats
      videoMat.delete()
      croppedMat.delete()

      if (!croppedBase64) {
        throw new Error('Failed to convert cropped image to base64')
      }
      
      // Use original screenshot for display, cropped for validation
      const imageToDisplay = originalScreenshot || croppedBase64

      // Store cropped image (may be used for display or storage)
      if (captureSide === 'front') {
        setFrontCroppedImage(croppedBase64)
      } else {
        setBackCroppedImage(croppedBase64)
      }

      // Store full screenshot for display (shows exactly as captured)
      // OCR validation removed - images are accepted without validation
      if (captureSide === 'front') {
        setFrontImage(imageToDisplay) // Store full screenshot for display
        setEidData({ captured: true })
      } else if (captureSide === 'back') {
        setBackImage(imageToDisplay) // Store full screenshot for display
      }
      
      setIsProcessing(false)
      setCurrentSide(null)
      setError(null) // Clear any previous errors
      
      // Close modal immediately after capture
      setModalOpen(false)
      setModalSide(null)
      stopAutoDetection()
      
      // Show success toast message
      if (captureSide === 'front') {
        showToast({
          type: 'success',
          message: 'UAE ID Front captured successfully!',
          duration: 5000
        })
      } else {
        showToast({
          type: 'success',
          message: 'UAE ID Back captured successfully!',
          duration: 5000
        })
      }
    } catch (err) {
      // Close modal on error
      setIsProcessing(false)
      setCurrentSide(null)
      setModalOpen(false)
      setModalSide(null)
      stopAutoDetection()
      
      // Show error toast message asking to retry
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to capture image. Please try again.',
        duration: 6000
      })
      
      // Reset capture flag on error to allow retry
      captureTriggeredRef.current = false
    }
  }, [opencvLoaded, stopAutoDetection])

  // Handle auto-capture after 6 seconds (with or without detected points)
  const handleAutoCapture = useCallback(async (side: 'front' | 'back') => {
    if (captureTriggeredRef.current) {
      return
    }

    // Stop detection interval
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }

    // Clear auto-capture timer
    if (autoCaptureTimerRef.current) {
      clearTimeout(autoCaptureTimerRef.current)
      autoCaptureTimerRef.current = null
    }

    // Set flag to prevent multiple captures
    captureTriggeredRef.current = true
    setIsProcessing(true)
    setError(null)
    setDetectionReady(true)

    try {
      const video = videoRef.current
      if (!video) {
        throw new Error('Camera video stream not available')
      }

      // Try to get detected points, or use full frame
      let pointsToUse: any[] | null = null
      if (detectedPoints && detectedPoints.length >= 4) {
        pointsToUse = detectedPoints
      } else {
        // If no points detected, use full frame
        const videoWidth = video.videoWidth || video.clientWidth
        const videoHeight = video.videoHeight || video.clientHeight
        pointsToUse = [
          { x: 0, y: 0 },
          { x: videoWidth, y: 0 },
          { x: videoWidth, y: videoHeight },
          { x: 0, y: videoHeight }
        ]
      }

      // Capture the image
      await autoCaptureDocument(pointsToUse, side)
    } catch (err) {
      captureTriggeredRef.current = false
      setIsProcessing(false)
      setDetectionReady(false)
      setError(err instanceof Error ? err.message : 'Failed to capture. Please try again.')
    }
  }, [detectedPoints, autoCaptureDocument])

  // Start automatic detection
  // Accept side as parameter to avoid relying on state that might not be updated yet
  const startAutoDetection = useCallback((side?: 'front' | 'back') => {
    // Clear any existing detection interval first
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    
    if (!opencvLoaded || !videoRef.current) {
      return
    }

    // Use provided side or fall back to currentSide state
    // But prefer the parameter since state updates are async
    const sideToUse: 'front' | 'back' | null = side || currentSide
    
    // Validate that side is set before starting detection
    if (!sideToUse || (sideToUse !== 'front' && sideToUse !== 'back')) {
      setError('Invalid scan side. Please try again.')
      setIsDetecting(false)
      return
    }

    setIsDetecting(true)
    setDetectionReady(false)
    setStabilityStartTime(null)
    setDetectedPoints(null)
    setRemainingSeconds(null)
    
    // Reset capture flag and detection timer when starting new detection
    captureTriggeredRef.current = false
    detectionStartTimeRef.current = null
    if (captureDelayTimeoutRef.current) {
      clearTimeout(captureDelayTimeoutRef.current)
      captureDelayTimeoutRef.current = null
    }

    const currentSideValue: 'front' | 'back' = sideToUse // Use the validated side

    // Detection interval - check every 200ms
    detectionIntervalRef.current = window.setInterval(async () => {
      // Stop detection if capture was triggered
      if (captureTriggeredRef.current) {
        return
      }

      if (!videoRef.current || !opencvLoaded || !canvasRef.current) {
        return
      }
      
      // Validate currentSide is still valid
      if (!currentSideValue || (currentSideValue !== 'front' && currentSideValue !== 'back')) {
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current)
          detectionIntervalRef.current = null
        }
        return
      }

      try {
        const result = await detectDocumentInFrame(videoRef.current)
        
        if (!result) {
          setDetectionReady(false)
          setDetectedPoints(null)
          drawDetection(null, canvasRef.current, videoRef.current, false)
          return
        }

        const { detected, points, blurScore } = result

        // Update blur score
        setLastBlurScore(blurScore)

        // Simple detection - if card is detected, capture immediately
        // No blur check, no delay, no complex validation - just detect and capture
        if (detected && points && points.length >= 4) {
          setDetectedPoints(points)
          drawDetection(points, canvasRef.current, videoRef.current, true)
          
          // Capture immediately when card is detected (before 6-second timer)
          if (!captureTriggeredRef.current) {
            // Clear the 6-second auto-capture timer since we're capturing now
            if (autoCaptureTimerRef.current) {
              clearTimeout(autoCaptureTimerRef.current)
              autoCaptureTimerRef.current = null
            }
            
            // Set flag immediately to prevent multiple captures
            captureTriggeredRef.current = true
            
            // Stop the detection interval FIRST before capturing
            if (detectionIntervalRef.current) {
              clearInterval(detectionIntervalRef.current)
              detectionIntervalRef.current = null
            }
            
            // Validate currentSideValue before capturing
            if (!currentSideValue || (currentSideValue !== 'front' && currentSideValue !== 'back')) {
              setError('Invalid scan side. Please restart the scan.')
              captureTriggeredRef.current = false
              detectionStartTimeRef.current = null
              setIsDetecting(false)
              return
            }
            
            // Capture the points and side in local variables FIRST (before any async operations)
            const pointsToCapture = points.map(p => ({ x: p.x, y: p.y })) // Create deep copy
            const sideToCapture: 'front' | 'back' = currentSideValue // Explicitly type it
            
            // Validate side one more time before calling capture
            if (sideToCapture !== 'front' && sideToCapture !== 'back') {
              setError('Invalid scan side detected. Please try again.')
              captureTriggeredRef.current = false
              detectionStartTimeRef.current = null
              setIsDetecting(false)
              return
            }
            
            // Update UI and trigger capture immediately
            setDetectionReady(true)
            
            // Call capture function after delay
            const capturePromise = autoCaptureDocument(pointsToCapture, sideToCapture)
            
            // Handle the promise to catch any errors
            capturePromise
              .then(() => {
                // Auto-capture completed successfully
              })
              .catch(err => {
                // Reset flag on error so user can try again
                captureTriggeredRef.current = false
                detectionStartTimeRef.current = null
                setIsProcessing(false)
                setDetectionReady(false)
                setError(err instanceof Error ? err.message : 'Capture failed. Please try again.')
              })
            
            return // Exit early to prevent further processing
          }
        } else {
          // Card not detected - clear everything
          setDetectionReady(false)
          setDetectedPoints(null)
          drawDetection(null, canvasRef.current, videoRef.current, false)
        }
      } catch {
        // Detection error - continue silently
      }
    }, 200) // Check every 200ms
  }, [opencvLoaded, MIN_BLUR_SCORE, STABILITY_DURATION, drawDetection, autoCaptureDocument, currentSide])

  const startScan = async (side: 'front' | 'back') => {
    setError(null)
    
    // Check camera support first
    const supportCheck = checkCameraSupport()
    if (!supportCheck.supported) {
      handleCameraError(new Error(supportCheck.error || 'Camera not supported'))
      return
    }
    
    // Always request permission before starting scan
    const granted = await requestCameraPermission()
    if (!granted) {
      return // Permission denied, keep showing error and upload option
    }
    
    setCameraError(null)
    setCurrentSide(side)
    
    // Wait for video element to be ready, then start detection
    // Pass side as parameter to avoid race condition with state update
    setTimeout(() => {
      if (videoRef.current && opencvLoaded) {
        startAutoDetection(side) // Pass side explicitly to avoid state timing issues
      }
    }, 500)
  }
  
  // Handle opening scan modal - defined after startScan
  const handleOpenScanModal = (side: 'front' | 'back') => {
    // Clear any previous camera errors
    setCameraError(null)
    setError(null)
    // File upload removed
    
    setModalSide(side)
    setModalOpen(true)
    
    // Start scan when modal opens - give it a bit more time for modal to render
    setTimeout(() => {
      startScan(side)
    }, 300)
  }
  
  const handleCameraError = (error: string | DOMException | Error) => {
    let errorMessage = 'Camera access denied or not available'
    
    if (typeof error === 'string') {
      errorMessage = error
    } else if (error instanceof Error || (typeof DOMException !== 'undefined' && (error as any) instanceof DOMException)) {
      errorMessage = error.message || 'Camera access error'
    }
    
    setCameraError(errorMessage)
    
    // File upload removed - camera capture only
  }
  
  // File upload function removed - camera capture only

  // Unused - kept for potential future use
  /*
  const _captureImage = useCallback(async () => {
    if (webcamRef.current) {
      // Small delay to ensure camera is ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const imageSrc = webcamRef.current.getScreenshot()
      
      if (!imageSrc) {
        setError('Failed to capture image. Please ensure camera permissions are granted and try again.')
        return
      }
      
      if (imageSrc) {
        setIsProcessing(true)
        setError(null)
        setProcessingMessage('Analyzing Emirates ID...')

        try {
          // Check if we're using TRUE-ID (skip OCR processing in Step 2)
          const useTrueID = !API_CONFIG.features.simulationMode
          
          if (useTrueID) {
            
            // TRUE-ID mode: Just capture and store the image
            // Full validation happens in Step 3 with face photo
            await new Promise(resolve => setTimeout(resolve, 500)) // Small delay for UX
            
            if (currentSide === 'front') {
              setFrontImage(imageSrc)
              setEidData({ captured: true, mode: 'TRUE-ID' })
            } else if (currentSide === 'back') {
              setBackImage(imageSrc)
            }
            
            setIsProcessing(false)
            setCurrentSide(null)
            
          } else {
            // Simulation mode: Process Emirates ID with OCR
            const result = await processEmiratesID(imageSrc, currentSide!)
            
            if (!result.success) {
              throw new Error(result.error || 'Failed to process Emirates ID')
            }
            
            // Validate ID data if processing front side
            if (currentSide === 'front' && result.data) {
              setProcessingMessage('Validating ID information...')
              
              // Validate ID format
              if (result.data.idNumber && !validateEmiratesIDFormat(result.data.idNumber)) {
                setError('Invalid Emirates ID format detected. Please ensure the ID is clear and properly aligned.')
                setIsProcessing(false)
                return
              }
              
              // Check expiry
              if (result.data.expiryDate && isEmiratesIDExpired(result.data.expiryDate)) {
                setError('This Emirates ID has expired. Please use a valid ID.')
                setIsProcessing(false)
                return
              }
              
              // Store extracted data
              setEidData(result.data)
            }
            
            // Success - store image
            if (currentSide === 'front') {
              setFrontImage(imageSrc)
            } else if (currentSide === 'back') {
              setBackImage(imageSrc)
            }
            
            setIsProcessing(false)
            setCurrentSide(null)
          }
          
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to process Emirates ID. Please try again.')
          setIsProcessing(false)
        }
      }
    }
  }, [currentSide])
  */

  const retake = (side: 'front' | 'back') => {
    stopAutoDetection()
    // Reset capture flag
    captureTriggeredRef.current = false
    if (side === 'front') {
      setFrontImage(null)
      setFrontCroppedImage(null)
      setEidData(null)
    } else {
      setBackImage(null)
      setBackCroppedImage(null)
    }
    setError(null)
    setCurrentSide(null)
  }

  // Cleanup on unmount or side change
  useEffect(() => {
    if (!currentSide) {
      stopAutoDetection()
    }
  }, [currentSide, stopAutoDetection])

  // Get video element from webcam
  useEffect(() => {
    if (webcamRef.current && currentSide) {
      const video = webcamRef.current.video
      if (video) {
        videoRef.current = video
      }
    }
  }, [currentSide, webcamRef])
  
  // Auto-start back side detection after front side is captured
  useEffect(() => {
    // Only trigger if:
    // 1. Front image is captured
    // 2. Back image is not captured yet
    // 3. No current scan is active
    // 4. Not currently processing
    // 5. OpenCV is loaded
    if (frontImage && !backImage && !currentSide && !isProcessing && opencvLoaded) {
      const timer = setTimeout(() => {
        startScan('back')
      }, 1000) // 1 second delay to show the captured front image
      
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frontImage, backImage, currentSide, isProcessing, opencvLoaded])

  const handlePhilippinesIdUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const imageData = reader.result as string
      if (side === 'front') {
        setPhilippinesIdFront(imageData)
      } else {
        setPhilippinesIdBack(imageData)
      }
      setError(null)
    }
    reader.onerror = () => {
      setError('Failed to read image file. Please try again.')
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhilippinesId = (side: 'front' | 'back') => {
    if (side === 'front') {
      setPhilippinesIdFront(null)
    } else {
      setPhilippinesIdBack(null)
    }
  }

  const handleContinue = () => {
    if (frontImage && backImage) {
      const verificationData: Partial<VerificationData> = {
        eidFrontImage: frontImage,
        eidBackImage: backImage,
        eidVerified: true,
      }
      
      // Add Philippines ID images for both routes
      if (philippinesIdFront && philippinesIdBack) {
        verificationData.philippinesIdFront = philippinesIdFront
        verificationData.philippinesIdBack = philippinesIdBack
      } else {
        setError('Please upload both front and back of your Philippines ID')
        return
      }
      
      onComplete(verificationData)
    } else {
      setError('Please scan both front and back of your Emirates ID')
    }
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
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-600 font-medium hidden xs:block whitespace-nowrap">
              Step 5 of 6
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 pb-6 sm:pb-8">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Verify Your Identity</h2>
          </div>

      {/* Instructions */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 sm:p-4 rounded-lg">
        <h4 className="text-sm sm:text-base font-semibold text-blue-800 mb-2">Instructions:</h4>
        <ul className="text-xs sm:text-sm text-blue-700 space-y-1">
          <li>• Position your Emirates ID card completely within the frame - ensure all edges are visible</li>
          <li>• Ensure good lighting with no glare or shadows</li>
          <li>• Keep the ID flat - it will capture automatically after 6 seconds when fully visible</li>
          <li>• The system will automatically detect and capture when ready (green overlay)</li>
          <li>• A yellow frame means detection is in progress</li>
          <li>• Avoid reflections and ensure all text is readable</li>
        </ul>
        {window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && (
          <div className="mt-3 text-xs text-blue-600 bg-blue-100 p-2 rounded">
            ⚠️ Camera requires HTTPS or localhost. Please ensure you're using HTTPS or localhost to access the camera.
          </div>
        )}
        {!opencvLoaded && (
          <div className="mt-3 text-xs text-blue-600 bg-blue-100 p-2 rounded">
            ⏳ Loading image processing library...
          </div>
        )}
      </div>
      
      {/* Camera Error Notice */}
      {cameraError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 font-semibold">Camera Access Error</p>
              <p className="text-sm text-red-600 mt-1">{String(cameraError)}</p>
              <div className="mt-3 text-sm text-red-700">
                <p className="font-semibold mb-1">Possible solutions:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Grant camera permissions in your browser</li>
                  <li>Use Chrome, Edge, or Firefox browser</li>
                  <li>Access via HTTPS or localhost</li>
                </ul>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={requestCameraPermission}
                  className="btn-primary flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Request Camera Access Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Scanning Interface */}
        <div className="space-y-4 sm:space-y-6">
         {/* Front Side */}
         <div className="bg-white border-2 border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
           <div className="flex items-center justify-between mb-3 sm:mb-4">
             <h4 className="text-base sm:text-lg font-semibold text-gray-800">
               {isPhToUae ? 'Receivers Front of Emirates ID' : 'Sender Front of Emirates ID'}
             </h4>
            {frontImage && (
              <CheckCircle className="w-6 h-6 text-green-500" />
            )}
          </div>

          {frontImage ? (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border-2 border-green-500">
                <img
                  src={frontImage}
                  alt="Emirates ID Front"
                  className="w-full h-auto max-h-64 sm:max-h-96 object-contain bg-gray-50"
                />
              </div>
              <button
                type="button"
                onClick={() => retake('front')}
                className="btn-secondary flex items-center justify-center gap-2 w-full min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4 flex-shrink-0" />
                Retake Front
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => handleOpenScanModal('front')}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 sm:py-4 text-sm sm:text-base lg:text-lg min-h-[48px]"
              >
                <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <Camera className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="hidden xs:inline">Scan Front of ID (Full Screen)</span>
                <span className="xs:hidden">Scan Front</span>
              </button>
              {/* File upload removed - camera capture only */}
            </div>
          )}

          {/* Modal for Full Screen Scanning - Front */}
          <IDScanModal
            isOpen={modalOpen && modalSide === 'front'}
            onClose={closeScanModal}
            title={isPhToUae ? "Scan Receivers Front of Emirates ID - Full Screen View" : "Scan Sender Front of Emirates ID - Full Screen View"}
          >
            <div className="flex flex-col h-full max-h-[85vh]">
              {currentSide === 'front' && !frontImage ? (
                <div className="flex-1 flex flex-col space-y-4">
                  {/* Instructions */}
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-2 sm:p-3 rounded">
                    <p className="text-xs sm:text-sm text-blue-800 mb-2">
                      <strong>Instructions:</strong> Hold your phone at a comfortable distance (about 30-40cm away) and position your Emirates ID card completely within the centered frame. Make sure the entire card is visible - no edges should be cut off. The system will automatically detect and capture after 6 seconds when the card is fully visible.
                    </p>
                    <p className="text-xs text-blue-700">
                      💡 Tip: Ensure the entire card is visible within the frame with all edges showing. The system will wait 6 seconds before capturing to give you time to position it correctly. Ensure good lighting and hold the card flat.
                    </p>
                  </div>

                  {/* Loading Screen - Show when processing */}
                  {isProcessing ? (
                    <div className="flex-1 bg-gray-50 rounded-lg flex items-center justify-center min-h-[50vh]">
                      <div className="text-center py-8 px-4">
                        <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-green-600 mx-auto mb-6" />
                        <p className="text-gray-700 text-xl font-semibold mb-2">{processingMessage || 'Processing image...'}</p>
                        <p className="text-sm text-gray-500">Please wait while we process your image</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Camera View - Full Screen */}
                      {!cameraError ? (
                        <div className="relative bg-black rounded-lg overflow-hidden flex-1 min-h-[40vh] sm:min-h-[50vh] flex items-center justify-center">
                          <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            screenshotQuality={isMobile ? 0.85 : 0.95}
                            className="w-full h-full object-contain"
                            videoConstraints={{
                              width: isMobile ? { ideal: 1280, max: 1920 } : { ideal: 1920 },
                              height: isMobile ? { ideal: 720, max: 1080 } : { ideal: 1080 },
                              facingMode: 'environment',
                              aspectRatio: { ideal: 16/9 }
                            }}
                            onUserMedia={(_stream) => {
                              setCameraError(null)
                              setError(null)
                              setTimeout(() => {
                                if (webcamRef.current?.video) {
                                  videoRef.current = webcamRef.current.video
                                  if (opencvLoaded && modalSide === 'front') {
                                    setCurrentSide('front')
                                    startAutoDetection('front')
                                    
                                    // Start 6-second auto-capture timer
                                    if (autoCaptureTimerRef.current) {
                                      clearTimeout(autoCaptureTimerRef.current)
                                    }
                                    autoCaptureTimerRef.current = window.setTimeout(() => {
                                      handleAutoCapture('front')
                                    }, 6000)
                                  }
                                }
                              }, 500)
                            }}
                            onUserMediaError={() => {
                              // Request permission again with better error handling
                              requestCameraPermission().catch(() => {
                                // Error already handled in requestCameraPermission
                              })
                            }}
                            forceScreenshotSourceSize={true}
                          />
                          
                          {/* Detection overlay canvas */}
                          <canvas
                            ref={canvasRef}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            style={{ zIndex: 10 }}
                          />
                          
                          {/* Guide frame - rectangular frame for easier positioning */}
                          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[85%] sm:w-[80%] md:w-[75%] aspect-[3/2] border-[3px] sm:border-4 border-dashed rounded-lg pointer-events-none transition-all duration-300 ${
                            detectionReady 
                              ? 'border-green-500 bg-green-500 bg-opacity-20 shadow-lg shadow-green-500/50' 
                              : detectedPoints 
                                ? 'border-yellow-400 bg-yellow-400 bg-opacity-10' 
                                : 'border-gray-300'
                          }`} 
                          style={{ 
                            maxWidth: isMobile ? '450px' : '550px',
                            maxHeight: isMobile ? '300px' : '367px'
                          }} />
                          
                          {/* Corner guides for better alignment */}
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[85%] sm:w-[80%] md:w-[75%] aspect-[3/2] pointer-events-none"
                            style={{ 
                              maxWidth: isMobile ? '450px' : '550px',
                              maxHeight: isMobile ? '300px' : '367px'
                            }}>
                            {/* Corner markers */}
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                          </div>
                          
                          {/* Detection status - positioned above the frame */}
                          {isDetecting && (
                            <div className="absolute top-[calc(50%-15vh)] sm:top-[calc(50%-18vh)] left-1/2 transform -translate-x-1/2 z-20 w-[90%] sm:w-auto max-w-md">
                              <div className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 rounded-lg text-white text-sm sm:text-base md:text-lg font-bold shadow-lg text-center ${
                                detectionReady 
                                  ? 'bg-green-600 animate-pulse' 
                                  : detectedPoints 
                                    ? 'bg-yellow-600' 
                                    : 'bg-blue-600'
                              }`}>
                                {detectionReady 
                                  ? '✓ Detected! Capturing...' 
                                  : detectedPoints 
                                    ? remainingSeconds !== null && remainingSeconds > 0
                                      ? `Card detected! Capturing in ${remainingSeconds}...`
                                      : 'Card detected! Hold steady...'
                                    : 'Position ID card in the frame'}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                    <div className="flex-1 bg-gray-100 rounded-lg p-8 text-center flex items-center justify-center min-h-[50vh]">
                      <div>
                        <Camera className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4 text-lg">Camera not available</p>
                        <p className="text-sm text-gray-500 mb-4">Please enable camera access to continue</p>
                      </div>
                    </div>
                      )}
                    </>
                  )}

                  {/* Cancel button only */}
                  {!isProcessing && !cameraError && opencvLoaded && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={closeScanModal}
                        className="btn-secondary w-full py-3 text-lg min-h-[48px]"
                      >
                        Cancel & Close
                      </button>
                    </div>
                  )}
                  
                  {/* Loading indicator */}
                  {!cameraError && !opencvLoaded && (
                    <div className="text-center py-6">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-2" />
                      <p className="text-gray-600">Loading image processing library...</p>
                    </div>
                  )}
                  
                  {/* Success message with cropped preview */}
                  {frontCroppedImage && !isProcessing && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border-2 border-green-500">
                      <div className="text-center mb-3">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                        <p className="text-lg font-bold text-green-700">Document Captured Successfully!</p>
                      </div>
                      <img
                        src={frontCroppedImage}
                        alt="Cropped Emirates ID Front"
                        className="w-full max-w-2xl mx-auto rounded-lg border-2 border-green-300"
                      />
                      <p className="text-sm text-green-600 mt-3 text-center">Closing automatically...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-green-600">Front ID Captured Successfully!</p>
                  <p className="text-sm text-gray-600 mt-2">You can close this window</p>
                </div>
              )}
            </div>
          </IDScanModal>
        </div>

         {/* Back Side */}
         <div className="bg-white border-2 border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
           <div className="flex items-center justify-between mb-3 sm:mb-4">
             <h4 className="text-base sm:text-lg font-semibold text-gray-800">
               {isPhToUae ? 'Receivers Back of Emirates ID' : 'Sender Back of Emirates ID'}
             </h4>
            {backImage && (
              <CheckCircle className="w-6 h-6 text-green-500" />
            )}
          </div>

          {backImage ? (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border-2 border-green-500">
                <img
                  src={backImage}
                  alt="Emirates ID Back"
                  className="w-full h-auto max-h-64 sm:max-h-96 object-contain bg-gray-50"
                />
              </div>
              <button
                type="button"
                onClick={() => retake('back')}
                className="btn-secondary flex items-center justify-center gap-2 w-full min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4 flex-shrink-0" />
                Retake Back
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => handleOpenScanModal('back')}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 sm:py-4 text-sm sm:text-base lg:text-lg min-h-[48px]"
              >
                <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <Camera className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="hidden xs:inline">Scan Back of ID (Full Screen)</span>
                <span className="xs:hidden">Scan Back</span>
              </button>
              {/* File upload removed - camera capture only */}
            </div>
          )}

          {/* Modal for Full Screen Scanning - Back */}
          <IDScanModal
            isOpen={modalOpen && modalSide === 'back'}
            onClose={closeScanModal}
            title={isPhToUae ? "Scan Receivers Back of Emirates ID - Full Screen View" : "Scan Sender Back of Emirates ID - Full Screen View"}
          >
            <div className="flex flex-col h-full max-h-[85vh]">
              {currentSide === 'back' && !backImage ? (
                <div className="flex-1 flex flex-col space-y-4">
                  {/* Instructions */}
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-2 sm:p-3 rounded">
                    <p className="text-xs sm:text-sm text-blue-800 mb-2">
                      <strong>Instructions:</strong> Hold your phone at a comfortable distance (about 30-40cm away) and position your Emirates ID card (back side) within the centered frame. The system will automatically detect and capture immediately when the card is recognized.
                    </p>
                    <p className="text-xs text-blue-700">
                      💡 Tip: The system captures automatically as soon as it detects your ID card. Ensure good lighting and hold the card flat within the frame.
                    </p>
                  </div>

                  {/* Loading Screen - Show when processing */}
                  {isProcessing ? (
                    <div className="flex-1 bg-gray-50 rounded-lg flex items-center justify-center min-h-[50vh]">
                      <div className="text-center py-8 px-4">
                        <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-green-600 mx-auto mb-6" />
                        <p className="text-gray-700 text-xl font-semibold mb-2">{processingMessage || 'Processing image...'}</p>
                        <p className="text-sm text-gray-500">Please wait while we process your image</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Camera View - Full Screen */}
                      {!cameraError ? (
                        <div className="relative bg-black rounded-lg overflow-hidden flex-1 min-h-[40vh] sm:min-h-[50vh] flex items-center justify-center">
                          <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            screenshotQuality={isMobile ? 0.85 : 0.95}
                            className="w-full h-full object-contain"
                            videoConstraints={{
                              width: isMobile ? { ideal: 1280, max: 1920 } : { ideal: 1920 },
                              height: isMobile ? { ideal: 720, max: 1080 } : { ideal: 1080 },
                              facingMode: 'environment',
                              aspectRatio: { ideal: 16/9 }
                            }}
                            onUserMedia={(_stream) => {
                              setCameraError(null)
                              setError(null)
                              setTimeout(() => {
                                if (webcamRef.current?.video) {
                                  videoRef.current = webcamRef.current.video
                                  if (opencvLoaded && modalSide === 'back') {
                                    setCurrentSide('back')
                                    startAutoDetection('back')
                                    
                                    // Start 6-second auto-capture timer
                                    if (autoCaptureTimerRef.current) {
                                      clearTimeout(autoCaptureTimerRef.current)
                                    }
                                    autoCaptureTimerRef.current = window.setTimeout(() => {
                                      handleAutoCapture('back')
                                    }, 6000)
                                  }
                                }
                              }, 500)
                            }}
                            onUserMediaError={() => {
                              // Request permission again with better error handling
                              requestCameraPermission().catch(() => {
                                // Error already handled in requestCameraPermission
                              })
                            }}
                            forceScreenshotSourceSize={true}
                          />
                          
                          {/* Detection overlay canvas */}
                          <canvas
                            ref={canvasRef}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            style={{ zIndex: 10 }}
                          />
                          
                          {/* Guide frame - rectangular frame for easier positioning */}
                          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[85%] sm:w-[80%] md:w-[75%] aspect-[3/2] border-[3px] sm:border-4 border-dashed rounded-lg pointer-events-none transition-all duration-300 ${
                            detectionReady 
                              ? 'border-green-500 bg-green-500 bg-opacity-20 shadow-lg shadow-green-500/50' 
                              : detectedPoints 
                                ? 'border-yellow-400 bg-yellow-400 bg-opacity-10' 
                                : 'border-gray-300'
                          }`} 
                          style={{ 
                            maxWidth: isMobile ? '450px' : '550px',
                            maxHeight: isMobile ? '300px' : '367px'
                          }} />
                          
                          {/* Corner guides for better alignment */}
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[85%] sm:w-[80%] md:w-[75%] aspect-[3/2] pointer-events-none"
                            style={{ 
                              maxWidth: isMobile ? '450px' : '550px',
                              maxHeight: isMobile ? '300px' : '367px'
                            }}>
                            {/* Corner markers */}
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                          </div>
                          
                          {/* Detection status - positioned above the frame */}
                          {isDetecting && (
                            <div className="absolute top-[calc(50%-15vh)] sm:top-[calc(50%-18vh)] left-1/2 transform -translate-x-1/2 z-20 w-[90%] sm:w-auto max-w-md">
                              <div className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 rounded-lg text-white text-sm sm:text-base md:text-lg font-bold shadow-lg text-center ${
                                detectionReady 
                                  ? 'bg-green-600 animate-pulse' 
                                  : detectedPoints 
                                    ? 'bg-yellow-600' 
                                    : 'bg-blue-600'
                              }`}>
                                {detectionReady 
                                  ? '✓ Detected! Capturing...' 
                                  : detectedPoints 
                                    ? remainingSeconds !== null && remainingSeconds > 0
                                      ? `Card detected! Capturing in ${remainingSeconds}...`
                                      : 'Card detected! Hold steady...'
                                    : 'Position ID card in the frame'}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                    <div className="flex-1 bg-gray-100 rounded-lg p-8 text-center flex items-center justify-center min-h-[50vh]">
                      <div>
                        <Camera className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4 text-lg">Camera not available</p>
                        <p className="text-sm text-gray-500 mb-4">Please enable camera access to continue</p>
                      </div>
                    </div>
                      )}
                    </>
                  )}

                  {/* Cancel button only */}
                  {!isProcessing && !cameraError && opencvLoaded && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={closeScanModal}
                        className="btn-secondary w-full py-3 text-lg min-h-[48px]"
                      >
                        Cancel & Close
                      </button>
                    </div>
                  )}
                  
                  {/* Loading indicator */}
                  {!cameraError && !opencvLoaded && (
                    <div className="text-center py-6">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-2" />
                      <p className="text-gray-600">Loading image processing library...</p>
                    </div>
                  )}
                  
                  {/* Success message with cropped preview */}
                  {backCroppedImage && !isProcessing && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border-2 border-green-500">
                      <div className="text-center mb-3">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                        <p className="text-lg font-bold text-green-700">Document Captured Successfully!</p>
                      </div>
                      <img
                        src={backCroppedImage}
                        alt="Cropped Emirates ID Back"
                        className="w-full max-w-2xl mx-auto rounded-lg border-2 border-green-300"
                      />
                      <p className="text-sm text-green-600 mt-3 text-center">Closing automatically...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-green-600">Back ID Captured Successfully!</p>
                  <p className="text-sm text-gray-600 mt-2">You can close this window</p>
                </div>
              )}
            </div>
          </IDScanModal>
        </div>
      </div>

      {/* Philippines ID Upload Section - Show for both routes */}
      <div className="space-y-4 sm:space-y-6">
          <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-3 sm:p-4 lg:p-6">
            <h3 className="text-base sm:text-lg font-bold text-blue-800 mb-2">
              {isPhToUae ? 'Sender Philippines National ID Upload' : 'Receivers Philippines National ID Upload'}
            </h3>
            <p className="text-xs sm:text-sm text-blue-700 mb-3 sm:mb-4">
              Please upload clear photos of both sides of your Philippines ID document.
            </p>

            {/* Front of Philippines ID */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h4 className="text-base sm:text-lg font-semibold text-gray-800">
                  {isPhToUae ? 'Sender Front of Philippines National ID' : 'Receivers Front of Philippines National ID'}
                </h4>
                {philippinesIdFront && (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                )}
              </div>

              {philippinesIdFront ? (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden border-2 border-green-500">
                    <img
                      src={philippinesIdFront}
                      alt="Philippines ID Front"
                      className="w-full h-auto max-h-64 sm:max-h-96 object-contain bg-gray-50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePhilippinesId('front')}
                    className="btn-secondary flex items-center justify-center gap-2 w-full min-h-[44px]"
                  >
                    <RotateCcw className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden xs:inline">Remove & Re-upload Front</span>
                    <span className="xs:hidden">Re-upload Front</span>
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhilippinesIdUpload(e, 'front')}
                      className="hidden"
                    />
                    <span className="btn-primary inline-flex items-center justify-center gap-2 min-h-[44px] px-4 sm:px-6">
                      <Upload className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="text-sm sm:text-base">
                        {isPhToUae ? 'Upload Sender Front of Philippines National ID' : 'Upload Receivers Front of Philippines National ID'}
                      </span>
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-2">Accepted formats: JPG, PNG, etc.</p>
                </div>
              )}
            </div>

            {/* Back of Philippines ID */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h4 className="text-base sm:text-lg font-semibold text-gray-800">
                  {isPhToUae ? 'Sender Back of Philippines National ID' : 'Receivers Back of Philippines National ID'}
                </h4>
                {philippinesIdBack && (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                )}
              </div>

              {philippinesIdBack ? (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden border-2 border-green-500">
                    <img
                      src={philippinesIdBack}
                      alt="Philippines ID Back"
                      className="w-full h-auto max-h-64 sm:max-h-96 object-contain bg-gray-50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePhilippinesId('back')}
                    className="btn-secondary flex items-center justify-center gap-2 w-full min-h-[44px]"
                  >
                    <RotateCcw className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden xs:inline">Remove & Re-upload Back</span>
                    <span className="xs:hidden">Re-upload Back</span>
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhilippinesIdUpload(e, 'back')}
                      className="hidden"
                    />
                    <span className="btn-primary inline-flex items-center justify-center gap-2 min-h-[44px] px-4 sm:px-6">
                      <Upload className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="text-sm sm:text-base">
                        {isPhToUae ? 'Upload Sender Back of Philippines National ID' : 'Upload Receivers Back of Philippines National ID'}
                      </span>
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-2">Accepted formats: JPG, PNG, etc.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-2">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Name mismatch popup removed - OCR validation disabled */}

      {/* Success details intentionally hidden per requirement */}

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary flex items-center justify-center gap-2 min-h-[48px] w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              Back
            </button>
            
            <button
              type="button"
              onClick={handleContinue}
              disabled={!frontImage || !backImage || !philippinesIdFront || !philippinesIdBack}
              className="btn-primary flex-1 min-h-[48px] flex items-center justify-center gap-2"
            >
              <span>Proceed to Face Scan</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 hidden sm:inline" />
              <span className="sm:hidden">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

