import React, { useRef, useState, useEffect } from 'react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' } // Prefer back camera
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        setError("Could not access camera. Please check permissions.");
        console.error("Camera error:", err);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-center items-center">
      <div className="relative w-full h-full max-w-md flex flex-col">
        {error ? (
          <div className="flex-1 flex items-center justify-center p-6 text-white text-center">
            {error}
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="flex-1 object-cover w-full h-full"
          />
        )}
        
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex justify-around items-center">
          <button 
            onClick={() => { stopCamera(); onClose(); }}
            className="text-white p-4 rounded-full bg-white/10 backdrop-blur-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <button 
            onClick={handleCapture}
            className="w-20 h-20 rounded-full border-4 border-white bg-white/20 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
          >
            <div className="w-16 h-16 rounded-full bg-white"></div>
          </button>
          
          <div className="w-14"></div> {/* Spacer for balance */}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;