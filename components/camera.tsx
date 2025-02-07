"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CameraProps {
  onCapture: (imageData: string) => void;
}

export function CameraComponent({ onCapture }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      console.log("🔹 Requesting camera access...");


      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: { exact: "environment" }, // Try forcing environment mode
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("✅ Camera access granted:", mediaStream);

      setStream(mediaStream);
      setIsActive(true);
    } catch (err) {
      console.error("❌ Camera error:", err);
      if (err instanceof Error) {
        switch (err.name) {
          case "NotAllowedError":
            setError("❌ Camera access denied. Please allow it in browser settings.");
            break;
          case "NotFoundError":
            setError("❌ No camera found.");
            break;
          case "NotReadableError":
            setError("❌ Camera is in use by another app.");
            break;
          case "SecurityError":
            setError("❌ Camera blocked due to HTTPS restriction.");
            break;
          default:
            setError("❌ Failed to start camera.");
        }
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsActive(false);
    }
  };

  // const takePhoto = () => {
  //   if (videoRef.current) {
  //     const canvas = document.createElement("canvas");
  //     canvas.width = videoRef.current.videoWidth;
  //     canvas.height = videoRef.current.videoHeight;
  //     const ctx = canvas.getContext("2d");
  //     if (ctx) {
  //       ctx.drawImage(videoRef.current, 0, 0);
  //       const imageData = canvas.toDataURL("image/jpeg", 0.8);
  //       console.log("📸 Captured Image Data:", imageData);
  //       onCapture(imageData);
  //       stopCamera();
  //     }
  //   }
  // };
  const takePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
  
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      onCapture(imageData);
      stopCamera();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("❌ Image size too large. Please choose an image under 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        onCapture(imageData);
      };
      reader.onerror = () => {
        setError("❌ Failed to read image file. Please try again.");
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ Ensure the video element is mounted and starts playing
  useEffect(() => {
    if (!isActive) {
      console.log("❌ Camera is not active, skipping video setup.");
      return;
    }
  
    if (!videoRef.current) {
      console.error("❌ Video element is NULL, React might not have rendered it yet.");
      return;
    }
  
    console.log("🎥 Video component mounted, videoRef is available:", videoRef.current);
  
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((error) => console.error("❌ Video play error:", error));
    }
  }, [isActive, stream]);

  return (
    <div className="relative w-full max-w-md mx-auto">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50">
        {isActive ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Camera className="w-16 h-16 text-gray-400 mb-8" />
          </div>
        )}
      </div>
      <div className="flex justify-center gap-4 mt-6">
        {!isActive ? (
          <>
            <Button variant="default" className="bg-black hover:bg-gray-800" onClick={startCamera}>
              <Camera className="w-4 h-4 mr-2" />
              Start Camera
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Image
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={stopCamera}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button variant="default" className="bg-black hover:bg-gray-800" onClick={takePhoto}>
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
          </>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
    </div>
  );
}
