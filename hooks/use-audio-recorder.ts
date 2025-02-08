"use client"

import { useState, useRef, useCallback, useEffect } from "react"
// import { convertToMp4 } from "@/lib/convertAudio"; // Ensure the path is correct


interface AudioRecorderState {
  isRecording: boolean
  isPaused: boolean
  audioUrl: string | null
  error: string | null
  stream: MediaStream | null
}

export function useAudioRecorder() {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    audioUrl: null,
    error: null,
    stream: null,
  })

  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // const convertToMp4 = async (blob: Blob) => {
  //   if (blob.type === "audio/m4a") {
  //     console.log("🔄 Converting M4A to MP4...");
  
  //     return new Blob([blob], { type: "audio/mp4" });
  //   }
  //   return blob; // If already supported, return as is
  // };

  // ✅ useEffect: Check for available microphones on mount
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        const audioDevices = devices.filter(device => device.kind === "audioinput");
        console.log("🎤 Available Microphone Devices:", audioDevices);

        if (audioDevices.length === 0) {
          console.error("❌ No microphones detected. Check device settings.");
          setState((prev) => ({ ...prev, error: "No microphones found. Please check your device settings." }));
        }
      })
      .catch((error) => console.error("❌ Error listing devices:", error));
  }, []);

  const startRecording = useCallback(async () => {
    try {
      console.log("🎤 Checking available devices...");
  
      const devices = await navigator.mediaDevices.enumerateDevices();
      const microphones = devices.filter(device => device.kind === "audioinput");
  
      if (microphones.length === 0) {
        console.error("❌ No microphone found.");
        setState((prev) => ({ ...prev, error: "No microphone detected. Please check your settings." }));
        return;
      }
  
      console.log("🎤 Microphone detected. Requesting access...");
  
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: microphones[0].deviceId } },
      });
  
      console.log("✅ Microphone access granted:", stream);
  
      // 🔹 Detect Safari and use `audio/mp4`, otherwise use `audio/webm`
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const mimeType = isSafari ? "audio/mp4" : "audio/webm"; // Set MIME type dynamically
  
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.warn(`❌ MIME type ${mimeType} is not supported, trying fallback.`);
      }
  
      mediaRecorder.current = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
  
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
  
      mediaRecorder.current.onstop = async () => {
        let audioBlob = new Blob(chunksRef.current, { type: mimeType });
  
        console.log("🤔 File MIME Type:", audioBlob.type);
        console.log("📏 File Size:", audioBlob.size, "bytes");
  
        if (audioBlob.size < 1000) {
          console.error("❌ File is too small. Recording might have failed.");
          return;
        }
  
        const file = new File([audioBlob], `recording.${isSafari ? "mp4" : "webm"}`, { type: mimeType });
  
        setState((prev) => ({ ...prev, audioUrl: URL.createObjectURL(file), isRecording: false, stream: null }));
  
        stream.getTracks().forEach((track) => track.stop());
      };
  
      mediaRecorder.current.start(100);
      setState((prev) => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        error: null,
        stream,
        audioUrl: null,
      }));
    } catch (error) {
      console.error("❌ Microphone access error:", error);
      setState((prev) => ({ ...prev, error: "Failed to access microphone. Please check your settings." }));
    }
  }, []);
  
  
  
  
  
  
  

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && state.isRecording) {
      mediaRecorder.current.stop()
      if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [state.isRecording, state.stream])

  const pauseRecording = useCallback(() => {
    if (mediaRecorder.current && state.isRecording) {
      mediaRecorder.current.pause()
      setState((prev) => ({ ...prev, isPaused: true }))
    }
  }, [state.isRecording])

  const resumeRecording = useCallback(() => {
    if (mediaRecorder.current && state.isPaused) {
      mediaRecorder.current.resume()
      setState((prev) => ({ ...prev, isPaused: false }))
    }
  }, [state.isPaused])

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  }
}

