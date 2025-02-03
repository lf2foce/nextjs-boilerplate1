"use client"

import { useState, useRef, useCallback } from "react"

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

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      })

      chunksRef.current = []

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" })
        const url = URL.createObjectURL(audioBlob)
        setState((prev) => ({ ...prev, audioUrl: url, isRecording: false, stream: null }))
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.current.start(100)
      setState((prev) => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        error: null,
        stream,
        audioUrl: null,
      }))
    } catch (error) {
      setState((prev) => ({ ...prev, error: "Error accessing microphone. Please ensure you have granted permission." }))
    }
  }, [])

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

