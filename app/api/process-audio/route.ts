import { OpenAI } from "openai"
import { NextResponse } from "next/server"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as Blob

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Convert Blob to File
    const file = new File([audioFile], "audio.webm", {
      type: "audio/webm",
    })

    try {
      // Transcribe audio
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        language: "vi",
      })

      if (!transcription.text) {
        throw new Error("No speech detected in the audio")
      }

      // Translate to English
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

      // Generate speech
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
        const errorText = await response.text()
        throw new Error(`ElevenLabs API error: ${errorText}`)
      }

      const audioBuffer = await response.arrayBuffer()

      return NextResponse.json({
        audio: Array.from(new Uint8Array(audioBuffer)),
        originalText: transcription.text,
        translatedText: englishText,
      })
    } catch (error) {
      console.error("API Error:", error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to process audio" },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Request Error:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}

