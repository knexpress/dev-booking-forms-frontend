import { useState } from 'react'
import { BookOpen, FileText, Upload, X, CheckCircle } from 'lucide-react'
import { generateBookingPDF } from '../utils/pdfGenerator'

interface HeaderProps {
  onBookNow?: () => void
}

export default function Header({ onBookNow }: HeaderProps) {
  const [showTestModal, setShowTestModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [testImages, setTestImages] = useState<{
    eidFront?: string
    eidBack?: string
    phIdFront?: string
    phIdBack?: string
    customerImage?: string
  }>({})

  const handleImageUpload = (file: File, imageType: 'eidFront' | 'eidBack' | 'phIdFront' | 'phIdBack' | 'customerImage') => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setTestImages(prev => ({ ...prev, [imageType]: base64String }))
    }
    reader.readAsDataURL(file)
  }

  const removeImage = (imageType: 'eidFront' | 'eidBack' | 'phIdFront' | 'phIdBack' | 'customerImage') => {
    setTestImages(prev => {
      const updated = { ...prev }
      delete updated[imageType]
      return updated
    })
  }

  const handleTestPDF = async () => {
    setIsGenerating(true)
    // Sample test data for PDF generation
    const testData = {
      referenceNumber: 'TEST-2024-001',
      bookingId: 'BK-12345',
      service: 'uae-to-pinas', // Change to 'ph-to-uae' to test other route
      sender: {
        fullName: 'Ahmed Al Maktoum',
        completeAddress: '456 Business Bay, Dubai, United Arab Emirates',
        contactNo: '+971501234567',
        emailAddress: 'ahmed.almaktoum@example.com',
        agentName: 'Test Agent',
        deliveryOption: 'warehouse' as const
      },
      receiver: {
        fullName: 'Juan Dela Cruz',
        completeAddress: '123 Main Street, Barangay San Antonio, Parañaque City, Metro Manila 1700',
        contactNo: '+639123456789',
        emailAddress: 'juan.delacruz@example.com',
        deliveryOption: 'address' as const,
        numberOfBoxes: 3
      },
      items: [
        { id: '1', commodity: 'Electronics', qty: 5 },
        { id: '2', commodity: 'Clothing', qty: 10 },
        { id: '3', commodity: 'Books', qty: 15 }
      ],
      eidFrontImage: testImages.eidFront,
      eidBackImage: testImages.eidBack,
      philippinesIdFront: testImages.phIdFront,
      philippinesIdBack: testImages.phIdBack,
      customerImage: testImages.customerImage,
      customerImages: testImages.customerImage ? [testImages.customerImage] : [],
      submissionTimestamp: new Date().toISOString(),
      declarationText: 'Test declaration text for PDF generation'
    }

    try {
      await generateBookingPDF(testData)
      setShowTestModal(false)
    } catch (error) {
      console.error('Error generating test PDF:', error)
      alert('Error generating test PDF. Please check the console.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <header className="bg-white shadow-sm">
        {/* Top Navigation Bar */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-green-600">KN EXPRESS</h1>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTestModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  title="Test PDF Generation with Images"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Test PDF</span>
                </button>
                {onBookNow && (
                  <button
                    onClick={onBookNow}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span className="hidden sm:inline">Book Now</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Test PDF Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Test PDF - Page 3 (ID Images)</h2>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-gray-600">Upload images to test the 3rd page of the PDF (ID Images page)</p>

              {/* Image Upload Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* EID Front */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Emirates ID - Front</label>
                  {testImages.eidFront ? (
                    <div className="space-y-2">
                      <img src={testImages.eidFront} alt="EID Front" className="w-full h-32 object-contain rounded" />
                      <button
                        onClick={() => removeImage('eidFront')}
                        className="w-full text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'eidFront')}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center justify-center py-4 text-gray-500">
                        <Upload className="w-8 h-8 mb-2" />
                        <span className="text-sm">Upload Image</span>
                      </div>
                    </label>
                  )}
                </div>

                {/* EID Back */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Emirates ID - Back</label>
                  {testImages.eidBack ? (
                    <div className="space-y-2">
                      <img src={testImages.eidBack} alt="EID Back" className="w-full h-32 object-contain rounded" />
                      <button
                        onClick={() => removeImage('eidBack')}
                        className="w-full text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'eidBack')}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center justify-center py-4 text-gray-500">
                        <Upload className="w-8 h-8 mb-2" />
                        <span className="text-sm">Upload Image</span>
                      </div>
                    </label>
                  )}
                </div>

                {/* Philippines ID Front */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Philippines ID - Front</label>
                  {testImages.phIdFront ? (
                    <div className="space-y-2">
                      <img src={testImages.phIdFront} alt="PH ID Front" className="w-full h-32 object-contain rounded" />
                      <button
                        onClick={() => removeImage('phIdFront')}
                        className="w-full text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'phIdFront')}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center justify-center py-4 text-gray-500">
                        <Upload className="w-8 h-8 mb-2" />
                        <span className="text-sm">Upload Image</span>
                      </div>
                    </label>
                  )}
                </div>

                {/* Philippines ID Back */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Philippines ID - Back</label>
                  {testImages.phIdBack ? (
                    <div className="space-y-2">
                      <img src={testImages.phIdBack} alt="PH ID Back" className="w-full h-32 object-contain rounded" />
                      <button
                        onClick={() => removeImage('phIdBack')}
                        className="w-full text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'phIdBack')}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center justify-center py-4 text-gray-500">
                        <Upload className="w-8 h-8 mb-2" />
                        <span className="text-sm">Upload Image</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Generate PDF Button */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowTestModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTestPDF}
                  disabled={isGenerating}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      Generate Test PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

