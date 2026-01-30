import { useState } from 'react'
import { generateBookingPDF } from '../utils/pdfGenerator'
import { FileText, Upload, X } from 'lucide-react'

// Sample test data
const sampleData = {
  referenceNumber: 'TEST-2024-001',
  bookingId: 'BK-12345',
  service: 'ph-to-uae', // Change to 'uae-to-pinas' to test other route
  sender: {
    fullName: 'Juan Dela Cruz',
    completeAddress: '123 Main Street, Barangay San Antonio, Parañaque City, Metro Manila 1700',
    contactNo: '+639123456789',
    emailAddress: 'juan.delacruz@example.com',
    agentName: 'Maria Santos',
    deliveryOption: 'warehouse' as const
  },
  receiver: {
    fullName: 'Ahmed Al Maktoum',
    completeAddress: '456 Business Bay, Dubai, United Arab Emirates',
    contactNo: '+971501234567',
    emailAddress: 'ahmed.almaktoum@example.com',
    deliveryOption: 'address' as const,
    numberOfBoxes: 3
  },
  items: [
    { id: '1', commodity: 'Electronics', qty: 5 },
    { id: '2', commodity: 'Clothing', qty: 10 },
    { id: '3', commodity: 'Books', qty: 15 },
    { id: '4', commodity: 'Toys', qty: 8 },
    { id: '5', commodity: 'Shoes', qty: 6 }
  ],
  eidFrontImage: undefined as string | undefined,
  eidBackImage: undefined as string | undefined,
  philippinesIdFront: undefined as string | undefined,
  philippinesIdBack: undefined as string | undefined,
  customerImage: undefined as string | undefined,
  customerImages: [] as string[],
  submissionTimestamp: new Date().toISOString(),
  declarationText: 'By proceeding with this shipment, I declare that the contents of my shipment do not contain any prohibited, illegal, or restricted items under international or local laws. I fully understand that shipping illegal goods constitutes a criminal offense and is punishable by law. I acknowledge that KNEX Delivery Services acts solely as a carrier and shall not be held responsible for the nature, condition, or contents of the shipment.'
}

export default function PDFTestPage() {
  const [testData, setTestData] = useState(sampleData)
  const [isGenerating, setIsGenerating] = useState(false)

  // Helper function to convert file to base64
  const handleImageUpload = (file: File, imageType: 'eidFront' | 'eidBack' | 'phIdFront' | 'phIdBack' | 'faceImage') => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      if (imageType === 'eidFront') {
        setTestData(prev => ({ ...prev, eidFrontImage: base64String }))
      } else if (imageType === 'eidBack') {
        setTestData(prev => ({ ...prev, eidBackImage: base64String }))
      } else if (imageType === 'phIdFront') {
        setTestData(prev => ({ ...prev, philippinesIdFront: base64String }))
      } else if (imageType === 'phIdBack') {
        setTestData(prev => ({ ...prev, philippinesIdBack: base64String }))
      } else if (imageType === 'faceImage') {
        setTestData(prev => ({ ...prev, customerImage: base64String, customerImages: [base64String] }))
      }
    }
    reader.readAsDataURL(file)
  }

  const removeImage = (imageType: 'eidFront' | 'eidBack' | 'phIdFront' | 'phIdBack' | 'faceImage') => {
    if (imageType === 'eidFront') {
      setTestData(prev => ({ ...prev, eidFrontImage: undefined }))
    } else if (imageType === 'eidBack') {
      setTestData(prev => ({ ...prev, eidBackImage: undefined }))
    } else if (imageType === 'phIdFront') {
      setTestData(prev => ({ ...prev, philippinesIdFront: undefined }))
    } else if (imageType === 'phIdBack') {
      setTestData(prev => ({ ...prev, philippinesIdBack: undefined }))
    } else if (imageType === 'faceImage') {
      setTestData(prev => ({ ...prev, customerImage: undefined, customerImages: [] }))
    }
  }

  const handleGeneratePDF = async () => {
    setIsGenerating(true)
    try {
      await generateBookingPDF(testData)
    } catch (error) {
      alert('Error generating PDF. Check console for details.')
    } finally {
      setIsGenerating(false)
    }
  }

  const updateField = (path: string, value: any) => {
    const keys = path.split('.')
    setTestData(prev => {
      const newData = { ...prev }
      let current: any = newData
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]] = { ...current[keys[i]] }
      }
      current[keys[keys.length - 1]] = value
      return newData
    })
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-green-600 mb-2">PDF Test Page</h1>
              <p className="text-gray-600">Quickly test PDF generation with sample data</p>
            </div>
            <button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Generate PDF
                </>
              )}
            </button>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => updateField('service', 'ph-to-uae')}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              Set Route: PH to UAE
            </button>
            <button
              onClick={() => updateField('service', 'uae-to-pinas')}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              Set Route: UAE to PHILIPPINES
            </button>
          </div>

          {/* Data Preview */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sender Details */}
              <div className="border rounded-lg p-4">
                <h3 className="font-bold text-lg mb-3">Sender Details</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <label className="font-semibold">Full Name:</label>
                    <input
                      type="text"
                      value={testData.sender.fullName}
                      onChange={(e) => updateField('sender.fullName', e.target.value)}
                      className="w-full px-2 py-1 border rounded mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-semibold">Address:</label>
                    <textarea
                      value={testData.sender.completeAddress}
                      onChange={(e) => updateField('sender.completeAddress', e.target.value)}
                      className="w-full px-2 py-1 border rounded mt-1"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="font-semibold">Contact:</label>
                    <input
                      type="text"
                      value={testData.sender.contactNo}
                      onChange={(e) => updateField('sender.contactNo', e.target.value)}
                      className="w-full px-2 py-1 border rounded mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-semibold">Email:</label>
                    <input
                      type="email"
                      value={testData.sender.emailAddress}
                      onChange={(e) => updateField('sender.emailAddress', e.target.value)}
                      className="w-full px-2 py-1 border rounded mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-semibold">Agent Name:</label>
                    <input
                      type="text"
                      value={testData.sender.agentName || ''}
                      onChange={(e) => updateField('sender.agentName', e.target.value)}
                      className="w-full px-2 py-1 border rounded mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Receiver Details */}
              <div className="border rounded-lg p-4">
                <h3 className="font-bold text-lg mb-3">Receiver Details</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <label className="font-semibold">Full Name:</label>
                    <input
                      type="text"
                      value={testData.receiver.fullName}
                      onChange={(e) => updateField('receiver.fullName', e.target.value)}
                      className="w-full px-2 py-1 border rounded mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-semibold">Address:</label>
                    <textarea
                      value={testData.receiver.completeAddress}
                      onChange={(e) => updateField('receiver.completeAddress', e.target.value)}
                      className="w-full px-2 py-1 border rounded mt-1"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="font-semibold">Contact:</label>
                    <input
                      type="text"
                      value={testData.receiver.contactNo}
                      onChange={(e) => updateField('receiver.contactNo', e.target.value)}
                      className="w-full px-2 py-1 border rounded mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-semibold">Email:</label>
                    <input
                      type="email"
                      value={testData.receiver.emailAddress}
                      onChange={(e) => updateField('receiver.emailAddress', e.target.value)}
                      className="w-full px-2 py-1 border rounded mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-semibold">Number of Boxes:</label>
                    <input
                      type="number"
                      value={testData.receiver.numberOfBoxes || ''}
                      onChange={(e) => updateField('receiver.numberOfBoxes', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 border rounded mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-3">Items</h3>
              <div className="space-y-2">
                {testData.items.map((item, index) => (
                  <div key={item.id} className="flex gap-2">
                    <input
                      type="text"
                      value={item.commodity}
                      onChange={(e) => {
                        const newItems = [...testData.items]
                        newItems[index].commodity = e.target.value
                        setTestData({ ...testData, items: newItems })
                      }}
                      placeholder="Commodity"
                      className="flex-1 px-2 py-1 border rounded"
                    />
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => {
                        const newItems = [...testData.items]
                        newItems[index].qty = parseInt(e.target.value) || 0
                        setTestData({ ...testData, items: newItems })
                      }}
                      placeholder="Qty"
                      className="w-20 px-2 py-1 border rounded"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Reference Number */}
            <div className="border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-3">Reference Info</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <label className="font-semibold">Reference Number:</label>
                  <input
                    type="text"
                    value={testData.referenceNumber}
                    onChange={(e) => updateField('referenceNumber', e.target.value)}
                    className="w-full px-2 py-1 border rounded mt-1"
                  />
                </div>
                <div>
                  <label className="font-semibold">Booking ID:</label>
                  <input
                    type="text"
                    value={testData.bookingId || ''}
                    onChange={(e) => updateField('bookingId', e.target.value)}
                    className="w-full px-2 py-1 border rounded mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Image Uploads */}
            <div className="border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-5">Test Images (5 images required)</h3>
              
              {/* EID Images Section */}
              <div className="mb-10">
                <h4 className="font-semibold text-base text-gray-700 mb-4 pb-2 border-b border-gray-200">
                  UAE EID (For UAE to PHILIPPINES route)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* EID Front */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-2.5 bg-gray-50">
                    <label className="block font-semibold text-xs mb-1.5 text-gray-700">EID Front</label>
                    {testData.eidFrontImage ? (
                      <div className="relative">
                        <img
                          src={testData.eidFrontImage}
                          alt="EID Front"
                          className="w-full h-20 object-contain border rounded bg-white"
                        />
                        <button
                          onClick={() => removeImage('eidFront')}
                          className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-md transition-colors"
                          title="Remove image"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors">
                        <Upload className="w-6 h-6 text-gray-400 mb-0.5" />
                        <span className="text-xs text-gray-600 font-medium">Click to upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload(file, 'eidFront')
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* EID Back */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-2.5 bg-gray-50">
                    <label className="block font-semibold text-xs mb-1.5 text-gray-700">EID Back</label>
                    {testData.eidBackImage ? (
                      <div className="relative">
                        <img
                          src={testData.eidBackImage}
                          alt="EID Back"
                          className="w-full h-20 object-contain border rounded bg-white"
                        />
                        <button
                          onClick={() => removeImage('eidBack')}
                          className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-md transition-colors"
                          title="Remove image"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors">
                        <Upload className="w-6 h-6 text-gray-400 mb-0.5" />
                        <span className="text-xs text-gray-600 font-medium">Click to upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload(file, 'eidBack')
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Philippines ID Images Section */}
              <div className="mb-10">
                <h4 className="font-semibold text-base text-gray-700 mb-4 pb-2 border-b border-gray-200">
                  Philippines ID (For PH to UAE route)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Philippines ID Front */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-2.5 bg-gray-50">
                    <label className="block font-semibold text-xs mb-1.5 text-gray-700">Philippines ID Front</label>
                    {testData.philippinesIdFront ? (
                      <div className="relative">
                        <img
                          src={testData.philippinesIdFront}
                          alt="Philippines ID Front"
                          className="w-full h-20 object-contain border rounded bg-white"
                        />
                        <button
                          onClick={() => removeImage('phIdFront')}
                          className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-md transition-colors"
                          title="Remove image"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors">
                        <Upload className="w-6 h-6 text-gray-400 mb-0.5" />
                        <span className="text-xs text-gray-600 font-medium">Click to upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload(file, 'phIdFront')
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Philippines ID Back */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-2.5 bg-gray-50">
                    <label className="block font-semibold text-xs mb-1.5 text-gray-700">Philippines ID Back</label>
                    {testData.philippinesIdBack ? (
                      <div className="relative">
                        <img
                          src={testData.philippinesIdBack}
                          alt="Philippines ID Back"
                          className="w-full h-20 object-contain border rounded bg-white"
                        />
                        <button
                          onClick={() => removeImage('phIdBack')}
                          className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-md transition-colors"
                          title="Remove image"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors">
                        <Upload className="w-6 h-6 text-gray-400 mb-0.5" />
                        <span className="text-xs text-gray-600 font-medium">Click to upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload(file, 'phIdBack')
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Face Image Section */}
              <div>
                <h4 className="font-semibold text-base text-gray-700 mb-4 pb-2 border-b border-gray-200">
                  Customer Face Image
                </h4>
                <div className="max-w-md">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-2.5 bg-gray-50">
                    <label className="block font-semibold text-xs mb-1.5 text-gray-700">Face Image</label>
                    {testData.customerImage ? (
                      <div className="relative">
                        <img
                          src={testData.customerImage}
                          alt="Face Image"
                          className="w-full h-20 object-contain border rounded bg-white"
                        />
                        <button
                          onClick={() => removeImage('faceImage')}
                          className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-md transition-colors"
                          title="Remove image"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors">
                        <Upload className="w-6 h-6 text-gray-400 mb-0.5" />
                        <span className="text-xs text-gray-600 font-medium">Click to upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload(file, 'faceImage')
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">How to Use:</h3>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Edit any field above to test different data</li>
            <li>Click "Generate PDF" to create and view the PDF</li>
            <li>Use route buttons to quickly switch between PH to UAE and UAE to PHILIPPINES</li>
            <li>Access this page anytime by adding <code className="bg-blue-100 px-1 rounded">?test=true</code> to the URL</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

