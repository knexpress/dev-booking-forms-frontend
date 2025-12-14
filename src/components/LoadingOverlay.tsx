interface LoadingOverlayProps {
  isVisible: boolean
  message?: string
}

export default function LoadingOverlay({ isVisible, message = 'Loading...' }: LoadingOverlayProps) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10 max-w-md mx-4 text-center">
        {/* Animated Cargo Truck Icon */}
        <div className="relative w-40 h-32 mx-auto mb-6 flex items-center justify-center overflow-hidden">
          {/* Road/Path Background */}
          <div className="absolute bottom-2 left-0 right-0 h-2 bg-gray-200 rounded-full">
            {/* Moving road lines */}
            <div className="absolute inset-0 flex gap-4 animate-road-lines">
              <div className="h-full w-8 bg-green-500"></div>
              <div className="h-full w-8 bg-green-500"></div>
              <div className="h-full w-8 bg-green-500"></div>
            </div>
          </div>
          
          {/* Animated Cargo Truck */}
          <svg 
            className="w-28 h-28 animate-truck-move relative z-10" 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Truck Body */}
            <rect x="15" y="35" width="45" height="25" rx="2" fill="#16a34a" />
            {/* Truck Cabin */}
            <rect x="60" y="40" width="20" height="20" rx="2" fill="#15803d" />
            {/* Cargo Box */}
            <rect x="20" y="30" width="35" height="8" rx="1" fill="#22c55e" />
            {/* Window */}
            <rect x="65" y="45" width="10" height="8" rx="1" fill="#dbeafe" />
            {/* Front Wheel */}
            <circle cx="25" cy="65" r="8" fill="#1f2937" />
            <circle cx="25" cy="65" r="5" fill="#4b5563" />
            {/* Back Wheel */}
            <circle cx="55" cy="65" r="8" fill="#1f2937" />
            <circle cx="55" cy="65" r="5" fill="#4b5563" />
            {/* Cargo Lines */}
            <line x1="25" y1="33" x2="25" y2="38" stroke="#15803d" strokeWidth="1" />
            <line x1="35" y1="33" x2="35" y2="38" stroke="#15803d" strokeWidth="1" />
            <line x1="45" y1="33" x2="45" y2="38" stroke="#15803d" strokeWidth="1" />
          </svg>
        </div>

        {/* Loading message */}
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
          {message}
        </h3>
        
        {/* Animated dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>

        {/* Progress bar animation */}
        <div className="mt-6 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 via-green-600 to-green-500 rounded-full" style={{
            animation: 'shimmer 1.5s infinite',
          }}></div>
        </div>
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
        
        @keyframes truck-move {
          0% {
            transform: translateX(-10px);
          }
          50% {
            transform: translateX(10px);
          }
          100% {
            transform: translateX(-10px);
          }
        }
        
        @keyframes road-lines {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-48px);
          }
        }
        
        .animate-truck-move {
          animation: truck-move 2s ease-in-out infinite;
        }
        
        .animate-road-lines {
          animation: road-lines 1s linear infinite;
        }
      `}</style>
    </div>
  )
}
