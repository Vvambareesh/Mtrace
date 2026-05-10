import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CameraScannerProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export default function CameraScanner({ onCapture, onClose }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please enable it in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError('Could not access camera: ' + err.message);
        }
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const handleCapture = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      
      // Simulate "Flash" effect
      const flash = document.createElement('div');
      flash.className = 'fixed inset-0 bg-white z-[100]';
      document.body.appendChild(flash);
      setTimeout(() => {
        document.body.removeChild(flash);
        onCapture(imageData);
      }, 100);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
    >
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={onClose}
          className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"
          id="close-camera"
        >
          <X size={24} />
        </button>
      </div>

      {error ? (
        <div className="flex flex-col items-center text-center p-8 max-w-sm">
          <ShieldAlert size={64} className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Camera Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={startCamera}
            className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium"
            id="retry-camera"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Scanning Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-64 h-80 border-2 border-white/50 rounded-lg relative overflow-hidden">
               <motion.div 
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.8)]"
               />
            </div>
            <p className="text-white bg-black/40 px-4 py-1 rounded-full text-sm mt-6 backdrop-blur-sm">
              Align receipt within frame
            </p>
          </div>

          <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center space-x-12 px-8">
            <button
               onClick={startCamera}
               className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white"
               id="flip-camera"
            >
              <RefreshCw size={24} />
            </button>

            <button
              onClick={handleCapture}
              disabled={isCapturing}
              className="p-6 bg-white rounded-full text-black shadow-xl scale-110 active:scale-95 transition-transform"
              id="capture-receipt"
            >
              {isCapturing ? <RefreshCw className="animate-spin" size={32} /> : <Camera size={32} />}
            </button>

            <div className="w-14" /> {/* Spacer */}
          </div>
        </div>
      )}
    </motion.div>
  );
}
