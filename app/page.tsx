"use client"

import { useState } from "react"
import { CameraComponent } from "@/components/camera"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { extractAndTranslateText, generateSpeech } from "./actions"
import { Volume2, Loader2, RotateCcw, Sparkles } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image";

export default function TranslatorApp() {
  const [image, setImage] = useState<string | null>(null)
  const [originalText, setOriginalText] = useState<string | null>(null)
  const [translation, setTranslation] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // const [isPortrait, setIsPortrait] = useState(true);

  // useEffect(() => {
  //   if (typeof window !== "undefined") { // ✅ Ensure it's running on client-side
  //     const handleResize = () => {
  //       setIsPortrait(window.matchMedia("(orientation: portrait)").matches);
  //     };

  //     handleResize(); // Initial check
  //     window.addEventListener("resize", handleResize);

  //     return () => window.removeEventListener("resize", handleResize);
  //   }
  // }, []);

  // const isPortrait = window.matchMedia("(orientation: portrait)").matches;

  // const [isPortrait, setIsPortrait] = useState<boolean | null>(null);

  // useEffect(() => {
  //   if (typeof window !== "undefined") {
  //     const handleResize = () => {
  //       setIsPortrait(window.innerHeight > window.innerWidth);
  //     };

  //     // ✅ Initial check
  //     handleResize();

  //     // ✅ Listen for screen resize events
  //     window.addEventListener("resize", handleResize);

  //     return () => window.removeEventListener("resize", handleResize);
  //   }
  // }, []);

  // ✅ Prevent rendering errors on SSR
  // if (isPortrait === null) return null;



  const handleImageCapture = async (imageData: string) => {
    // console.log("Captured Image Data:", imageData); // Log the image data
    
    // Remove Data URL prefix if present
    const base64Image = imageData.split(",")[1];

    if (!base64Image) {
      setError("Invalid image data");
      return;
    }
    setImage(imageData)
    setError(null)
    setIsProcessing(true)

    try {
      const result = await extractAndTranslateText(imageData)

      if ("error" in result) {
        setError(result.error || null); // Ensure that we pass a string or null
        return;
      }

      setOriginalText(result.originalText?? "")
      setTranslation(result.translatedText?? "")
    } catch (err) {
      setError("Failed to process image. Please try again.")
      console.error("Error:", err); 
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSpeak = async () => {
    if (!translation || isPlaying) return

    if (!translation || isPlaying) return;

  try {
    setIsPlaying(true);

    // ✅ Ensure the API call returns a valid Base64 string
    const audioData = await generateSpeech(translation);
    if (!audioData) throw new Error("Invalid audio data");

    // ✅ Create an audio element and play it
    const audio = new Audio(`data:audio/mpeg;base64,${audioData}`);

    // ✅ Handle playback errors (e.g., autoplay restrictions)
    audio.play().catch(err => {
      console.error("Audio playback failed:", err);
      setError("Audio playback blocked. Please tap to play.");
      setIsPlaying(false);
    });

    audio.onended = () => setIsPlaying(false);
    } catch (err) {
      console.error("Error generating speech:", err);
      setError("Failed to generate speech. Please try again.");
      setIsPlaying(false);
    }
  }

  const handleReset = () => {
    setImage(null)
    setOriginalText(null)
    setTranslation(null)
    setError(null)
    setIsProcessing(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-100 p-4">
      <div className="max-w-md mx-auto space-y-8 py-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">Magic Translator</h1>
          <p className="text-gray-600 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            Take a picture and watch the magic happen!
            <Sparkles className="w-4 h-4 text-yellow-500" />
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={image ? "result" : "camera"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-6">
                {!image ? (
                  <CameraComponent onCapture={handleImageCapture} />
                ) : (
                  <div className="space-y-6">
                    {/* <img
                      src={image || "/placeholder.svg"}
                      alt="Captured"
                      className="w-full rounded-lg border border-gray-200"
                    /> */}


{/* <Image
  src={image || "/placeholder.svg"}
  alt="Captured"
  width={500} // Adjust width as needed
  height={800} // Adjust height as needed
  className="w-full rounded-lg border border-gray-200"
/> */}
<Image
  src={image || "/placeholder.svg"}
  alt="Captured"
  width={0} // ✅ Let it scale dynamically
  height={0}
  sizes="100vw"
  className="w-full h-auto max-w-full rounded-lg border border-gray-200 object-contain"
/>
         {/* <Image
          src={image}
          alt="Captured"
          width={isPortrait ? 500 : 800} // ✅ Use dynamic width
          height={isPortrait ? 700 : 500} // ✅ Use dynamic height
          className={`w-full rounded-lg border border-gray-200 object-contain ${isPortrait ? "" : "rotate-90"}`} // ✅ Rotate preview if landscape
        /> */}
                    

                    {error ? (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-4">
                        {isProcessing ? (
                          <div className="flex flex-col items-center justify-center gap-4 p-8">
                            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                            <p className="text-gray-600">Working some magic...</p>
                          </div>
                        ) : (
                          translation && (
                            <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                              <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                                <p className="text-sm font-medium text-gray-600 mb-2">Original Text:</p>
                                <p className="text-gray-900">{originalText}</p>
                              </div>
                              <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                                <p className="text-sm font-medium text-gray-600 mb-2">Vietnamese Translation:</p>
                                <p className="text-gray-900 font-medium">{translation}</p>
                              </div>
                              <div className="flex justify-center gap-4 pt-4">
                                <Button
                                  variant="default"
                                  className="bg-purple-600 hover:bg-purple-700"
                                  onClick={handleSpeak}
                                  disabled={isPlaying}
                                >
                                  {isPlaying ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Volume2 className="w-4 h-4 mr-2" />
                                  )}
                                  Listen
                                </Button>
                                <Button variant="outline" onClick={handleReset}>
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                  Try Another
                                </Button>
                              </div>
                            </motion.div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

