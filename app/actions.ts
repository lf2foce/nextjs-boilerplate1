"use server"

import { OpenAI } from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateSpeech(audioBlob: Blob) {
  try {
    // Convert Blob to File for OpenAI API
    const audioFile = new File([audioBlob], "audio.webm", { type: "audio/webm" })

    // First, convert the audio to text using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "vi",
    })

    console.log("Transcription:", transcription.text)

    // Translate Vietnamese to English
    const translation = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a Vietnamese to English translator. Translate the following text to English, maintaining the original meaning and tone:",
        },
        {
          role: "user",
          content: transcription.text,
        },
      ],
    })

    const englishText = translation.choices[0].message.content

    console.log("Translation:", englishText)

    // Generate speech from English text using ElevenLabs
    const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM", {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: englishText,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to generate speech")
    }

    const audioBuffer = await response.arrayBuffer()
    return {
      audio: audioBuffer,
      originalText: transcription.text,
      translatedText: englishText,
    }
  } catch (error) {
    console.error("Error in speech processing:", error)
    throw error
  }
}

