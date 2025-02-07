"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Camera, Upload, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CameraProps {
  onCapture: (imageData: string) => void
}

export function CameraComponent({ onCapture }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startCamera = async () => {
    try {
      setError(null)
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setStream(mediaStream)
      setIsActive(true)
    } catch (err) {
      console.error("Camera error:", err)
      if (err instanceof Error) {
        switch (err.name) {
          case "NotAllowedError":
            setError("Please allow camera access to use this feature.")
            break
          case "NotFoundError":
            setError("No camera found. You can upload an image instead.")
            break
          case "NotReadableError":
            setError("Camera is in use by another application.")
            break
          default:
            setError("Failed to start camera. You can upload an image instead.")
        }
      }
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
      setIsActive(false)
    }
  }

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas")
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0)
        const imageData = canvas.toDataURL("image/jpeg", 0.8)
           console.log("Captured Image Data:", imageData);
        onCapture(imageData)
        stopCamera()
      }
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        setError("Image size too large. Please choose an image under 5MB.")
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const imageData = reader.result as string
        onCapture(imageData)
      }
      reader.onerror = () => {
        setError("Failed to read image file. Please try again.")
      }
      reader.readAsDataURL(file)
    }
  }

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  return (
    <div className="relative w-full max-w-md mx-auto">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50">
        {isActive ? (
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
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
  )
}

