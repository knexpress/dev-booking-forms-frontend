import { Truck, Package, RefreshCw, Plane, Shield, FileText } from 'lucide-react'
import { generateBookingPDF } from '../utils/pdfGenerator'

interface LandingPageProps {
  onBookShipment: () => void
}

export default function LandingPage({ onBookShipment }: LandingPageProps) {
  const handleTestPDF = async () => {
    try {
      // Sample test data for PDF generation
      const testData = {
        referenceNumber: 'TEST-2024-001',
        bookingId: 'BK-TEST-12345',
        service: 'uae-to-pinas',
        sender: {
          fullName: 'John Doe',
          completeAddress: '123 Main Street, Dubai, UAE',
          contactNo: '+971501234567',
          emailAddress: 'john.doe@example.com',
          agentName: 'Test Agent',
          formFillerLatitude: 25.204849,
          formFillerLongitude: 55.270783,
          deliveryOption: 'warehouse' as const
        },
        receiver: {
          fullName: 'Jane Smith',
          completeAddress: '456 Business Bay, Dubai, UAE',
          contactNo: '+971501234568',
          emailAddress: 'jane.smith@example.com',
          deliveryOption: 'address' as const,
          numberOfBoxes: 3
        },
        items: [
          { id: '1', commodity: 'Electronics', qty: 5 },
          { id: '2', commodity: 'Clothing', qty: 10 },
          { id: '3', commodity: 'Books', qty: 15 }
        ],
        eidFrontImage: undefined,
        eidBackImage: undefined,
        philippinesIdFront: undefined,
        philippinesIdBack: undefined,
        customerImage: undefined,
        customerImages: [],
        submissionTimestamp: new Date().toISOString(),
        declarationText: 'By proceeding with this shipment, I declare that the contents of my shipment do not contain any prohibited, illegal, or restricted items under international or local laws. I fully understand that shipping illegal goods constitutes a criminal offense and is punishable by law. I acknowledge that KNEX Delivery Services acts solely as a carrier and shall not be held responsible for the nature, condition, or contents of the shipment. I further acknowledge that I have allowed the system to access my location through the browser\'s geolocation service, and I understand that my latitude and longitude coordinates have been captured for verification and communication purposes related to this booking.'
      }

      await generateBookingPDF(testData, { openInNewTab: true })
    } catch (error) {
      console.error('Error generating test PDF:', error)
      alert('Failed to generate test PDF. Please check the console for details.')
    }
  }

  return (
    <div className="flex-1 bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Headline Section */}
        <div className="mb-8">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-800 leading-tight mb-4">
            <span className="block">Not Just a Cargo,</span>
            <span className="block">It's a Promise We</span>
            <span className="block text-green-600">Deliver</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mt-6 max-w-3xl leading-relaxed">
            We deliver your shipments with speed, security, and full transparency, from personal packages to commercial cargo, we deliver with the same care and commitment.
          </p>
        </div>

        {/* Book Shipment and Test PDF Buttons */}
        <div className="mb-12 flex items-center gap-4">
          <button
            onClick={onBookShipment}
            className="flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <Truck className="w-6 h-6" />
            <span>Book Shipment</span>
          </button>
          
          <button
            onClick={handleTestPDF}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all text-sm"
            title="Generate Test PDF with sample data"
          >
            <FileText className="w-4 h-4" />
            <span>Test PDF</span>
          </button>
        </div>

        {/* Service Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-gray-800 font-medium">No Minimum Weight</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <RefreshCw className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-gray-800 font-medium">Real-Time Updates</span>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Plane className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-gray-800 font-medium">2-3 Days Delivery</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-gray-800 font-medium">100% Insured</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

