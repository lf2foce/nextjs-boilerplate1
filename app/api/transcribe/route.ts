import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Convert Blob to File with proper name and type
    const audioFile = new File([file], 'audio.wav', { type: 'audio/wav' });

    // Transcribe audio
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'vi',
    });

    // Translate text
    const translation = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a Vietnamese to English translator. Translate the following text accurately while maintaining context and meaning.'
        },
        {
          role: 'user',
          content: `Translate this Vietnamese text to English: "${transcription.text}"`
        }
      ],
    });

    return NextResponse.json({
      text: translation.choices[0].message.content?.trim(),
      originalText: transcription.text,
      confidence: transcription.confidence || 0.95,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to process audio' },
      { status: 500 }
    );
  }
}