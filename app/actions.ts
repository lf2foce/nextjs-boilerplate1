"use server"

// import OpenAI from "openai"
import { Buffer } from "buffer"
import Together from "together-ai";
const together = new Together(
  {apiKey: process.env['TOGETHER_API_KEY']}, 
);
// import { ElevenLabsClient } from "elevenlabs";
// import { Readable } from "stream";

// const client = new ElevenLabsClient({
//   apiKey: process.env.ELEVENLABS_API_KEY, // Ensure this is set in your environment variables
// });

// Initialize OpenAI Client
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY, // Ensure this is set in your environment variables
// })

export async function extractAndTranslateText(imageBase64: string) {
  try {
    // Remove Data URL prefix if present
    const base64Image = imageBase64.split(",")[1]

    if (!base64Image) {
      throw new Error("Invalid image data")
    }

    // Convert Base64 to Buffer and back to ensure proper encoding
    const buffer = Buffer.from(base64Image, "base64")
    const encodedImage = buffer.toString("base64")
    
    // Extract English text from image using GPT-4o Vision API
    // const response = await openai.chat.completions.create({
  //     const response = await together.chat.completions.create({
  //     // model: "gpt-4o",
  //     model: "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
  //     messages: [
  //       {
  //         role: "user",
  //         content: [
  //           {
  //             type: "text",
  //             text: 'Extract any English text from this image. Only return the text you see, nothing else. If there is no English text, say "No English text found."',
  //           },
  //           {
  //             type: "image_url",
  //             image_url: {
  //               url: `data:image/jpeg;base64,${encodedImage}`,
  //               // detail: "low",
  //             },
  //           },
  //         ],
  //       },
  //     ],
  //   })

  //   // Extract text from OpenAI's response
  //   const extractedText = response.choices[0]?.message?.content?.trim()

  //   if (!extractedText || extractedText === "No English text found.") {
  //     return { error: "No English text found in the image" }
  //   }

  //   // Translate extracted text to Vietnamese using OpenAI
  //   const translationResponse = await openai.chat.completions.create({
  //     model: "gpt-4o",
  //     messages: [
  //       {
  //         role: "user",
  //         content: `Translate this English text to Vietnamese:\n\n${extractedText}`,
  //       },
  //     ],
  //   })

  //   const translatedText = translationResponse.choices[0]?.message?.content?.trim()

  //   return { originalText: extractedText, translatedText }
  // } catch (error) {
  //   console.error("Error processing image:", error)
  //   return { error: "Failed to process image and translate text" }
  // }
  // Single API call to extract and translate text using Llama vision model
  const response = await together.chat.completions.create({
    model: "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: 'First extract any English text from this image, then translate it to Vietnamese. Format your response exactly like this example:\nEnglish: [extracted text]\nVietnamese: [translated text]\nIf there is no English text, just respond with "No English text found."',
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${encodedImage}`,
            },
          },
        ],
      },
    ],
  })

  console.log("Raw API response:", response.choices[0]?.message?.content)
  const result = response.choices[0]?.message?.content?.trim()

  if (!result) {
    console.error("Empty response from API")
    return { error: "No response from image processing" }
  }

  if (result === "No English text found.") {
    console.log("No English text detected in image")
    return { error: "No English text found in the image" }
  }

  // Parse the response
  // const englishMatch = result.match(/English: (.*)\n/)
  // const vietnameseMatch = result.match(/Vietnamese: (.*)/)

  const englishMatch = result.match(/English:([\s\S]*?)(?=Vietnamese:)/i)
  const vietnameseMatch = result.match(/Vietnamese:([\s\S]*?)$/i)

  console.log("Parsing results:", {
    englishFound: !!englishMatch,
    vietnameseFound: !!vietnameseMatch,
    rawEnglish: englishMatch?.[1],
    rawVietnamese: vietnameseMatch?.[1]
  })

  if (!englishMatch?.[1] || !vietnameseMatch?.[1]) {
    console.error("Failed to parse response:", result)
    return { error: "Failed to extract or translate text" }
  }

  const finalResult = {
    originalText: englishMatch[1].trim(),
    translatedText: vietnameseMatch[1].trim()
  }
  console.log("Successfully processed image:", finalResult)
  return finalResult

} catch (err) {
  console.error("Detailed error:", {
    error: err,
    message: err instanceof Error ? err.message : "Unknown error message",
    stack: err instanceof Error ? err.stack : "No stack trace available"
  })
  return { error: "Failed to process image and translate text" }
}

}

export async function generateSpeech(text: string) {
  try {
    const voiceId = "GATds6kYPBX2tRfQExbR"; //Phuong "YjkAyVltWqOOytF4YEM3";//TA "GATds6kYPBX2tRfQExbR"; //"JBFqnCBsd6RMkjVDRZzb"; // Replace with the best Vietnamese voice ID

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_flash_v2_5", // "eleven_turbo_v2.5", // "eleven_multilingual_v2",
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to generate speech: ${response.statusText}`);
    }

    // Convert response to a Base64 string
    const audioBuffer = await response.arrayBuffer();
    return Buffer.from(audioBuffer).toString("base64");
  } catch (error) {
    console.error("Speech generation error:", error);
    return { error: "Failed to generate speech" };
  }
}