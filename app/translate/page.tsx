"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mic, Pause, Play, Square, Volume2, Loader2 } from "lucide-react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useToast } from "@/components/ui/use-toast";

export default function AudioProcessor() {
  const { toast } = useToast();
  const {
    isRecording,
    isPaused,
    audioUrl,
    error,
    stream,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = useAudioRecorder();

  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState<{
    original: string;
    translated: string;
  } | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Live transcription setup
  useEffect(() => {
    if (!stream) {
      setLiveTranscript("");
      recognitionRef.current?.stop();
      return;
    }
  
    const setupRecognition = () => {
      if ("webkitSpeechRecognition" in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;
  
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "vi-VN";
  
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let transcript = "";
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setLiveTranscript(transcript);
        };
  
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error("Speech recognition error:", event.error);
          if (event.error === "no-speech") {
            recognition.stop();
            setTimeout(() => {
              if (stream.active) {
                recognition?.start();
              }
            }, 100);
          }
        };
  
        recognition.onend = () => {
          if (stream.active) {
            recognition?.start();
          }
        };
  
        recognitionRef.current = recognition;
        recognition.start();
      }
    };
  
    setupRecognition();
  
    return () => {
      recognitionRef.current?.stop();
    };
  }, [stream]);

  const handleProcess = async () => {
    if (!audioUrl) return;

    try {
      setIsProcessing(true);
      const response = await fetch(audioUrl);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append("audio", blob, "audio.webm");

      toast({
        title: "Processing audio",
        description: "Converting speech to text and translating...",
      });

      const result = await fetch("/api/process-audio", {
        method: "POST",
        body: formData,
      });

      if (!result.ok) {
        const errorData = await result.json().catch(() => ({ error: "Failed to process audio" }));
        throw new Error(errorData.error || "Failed to process audio");
      }

      const data = await result.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const audioArray = new Uint8Array(data.audio);
      const audioBlob = new Blob([audioArray], { type: "audio/mpeg" });
      const url = URL.createObjectURL(audioBlob);

      setGeneratedAudioUrl(url);
      setTranscription({
        original: data.originalText,
        translated: data.translatedText,
      });

      toast({
        title: "Processing complete",
        description: "Your audio has been translated and converted to speech!",
      });
    } catch (error) {
      console.error("Error processing audio:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Vietnamese to English Translator</CardTitle>
          <CardDescription>Record Vietnamese speech to translate to English</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">{error}</div>}

          {liveTranscript && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-1">Live Transcript:</p>
              <p>{liveTranscript}</p>
            </div>
          )}

          <div className="flex justify-center gap-2">
            {!isRecording ? (
              <Button onClick={startRecording}>
                <Mic className="w-4 h-4 mr-2" />
                Start Recording
              </Button>
            ) : (
              <>
                {isPaused ? (
                  <Button onClick={resumeRecording}>
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </Button>
                ) : (
                  <Button onClick={pauseRecording}>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                )}
                <Button variant="destructive" onClick={stopRecording}>
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </>
            )}
          </div>

          {audioUrl && (
            <div className="space-y-4">
              <div className="font-medium">Your Recording:</div>
              <audio src={audioUrl} controls className="w-full" />
              <Button className="w-full" onClick={handleProcess} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 mr-2" />
                    Translate & Generate Speech
                  </>
                )}
              </Button>
            </div>
          )}

          {transcription && (
            <div className="space-y-2 p-4 bg-muted rounded-lg text-sm">
              <div>
                <span className="font-medium">Original (Vietnamese):</span>
                <p className="mt-1">{transcription.original}</p>
              </div>
              <div className="border-t border-border mt-2 pt-2">
                <span className="font-medium">Translated (English):</span>
                <p className="mt-1">{transcription.translated}</p>
              </div>
            </div>
          )}

          {generatedAudioUrl && (
            <div className="space-y-2">
              <div className="font-medium">Generated Speech:</div>
              <audio src={generatedAudioUrl} controls className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}