import os
import json
import base64
import soundfile as sf
import audioread
import uuid
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from elevenlabs import ElevenLabs
from openai import OpenAI
import tempfile
from io import BytesIO


# Load environment variables
load_dotenv()

# Load API keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

# Initialize OpenAI and ElevenLabs clients
openai_client = OpenAI(api_key=OPENAI_API_KEY)
elevenlabs_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

# FastAPI instance
app = FastAPI(
    title="Vietnamese to English Translator API",
    docs_url="/api/py/docs",
    openapi_url="/api/py/openapi.json",
)

class AudioResponse(BaseModel):
    """Response model for processed audio."""
    audio: str  # Base64-encoded audio
    originalText: str
    translatedText: str

def get_file_extension(content_type: str) -> str:
    """Get file extension from content type."""
    content_type_map = {
        'audio/webm': 'webm',
        'audio/mp4': 'mp4',
        'audio/mpeg': 'mp3',
        'audio/mp3': 'mp3',
        'audio/wav': 'wav',
        'audio/ogg': 'ogg',
        'audio/x-m4a': 'm4a',
    }
    return content_type_map.get(content_type, 'webm')

@app.post("/api/py/process-audio", response_model=AudioResponse)
async def process_audio(audio: UploadFile = File(...)):
    """Processes uploaded audio: Transcribes, Translates, and Generates Speech."""
    try:
        # Read uploaded audio into memory
        audio_bytes = await audio.read()
        
        # Get the appropriate file extension
        file_ext = get_file_extension(audio.content_type)
        
        # Create a named BytesIO buffer with the correct extension
        audio_buffer = BytesIO(audio_bytes)
        
        # Transcribe audio using OpenAI Whisper
        transcription = openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=("audio." + file_ext, audio_buffer, audio.content_type),
            language="vi",
        )

        
        # temp_dir = tempfile.mkdtemp()
        # temp_audio_path = os.path.join(temp_dir, "audio.webm")
        # temp_wav_path = os.path.join(temp_dir, "audio.wav")

        # print(f"🔹 Temp Directory: {temp_dir}")  # Debugging line
        # 🔹 Detect file format dynamically (Safari = mp4, Chrome = webm)
        # 🔹 Check file extension (Safari = mp4, Chrome = webm)
        # file_extension = "mp4" if audio.content_type == "audio/mp4" else "webm"
        # temp_audio_path = f"/tmp/audio.{file_extension}"
        # temp_wav_path = "/tmp/audio.wav"
        # print(f"🔹 Received File Type: {audio.content_type}")

        # 🔹 Save uploaded audio file
        # with open(temp_audio_path, "wb") as temp_audio:
        #     temp_audio.write(await audio.read())

        # # ✅ Convert `mp4` to `wav` for Whisper API
        # if file_extension == "mp4":
        #     temp_wav_path = "/tmp/audio.wav"
        #     ffmpeg.input(temp_audio_path).output(temp_wav_path, format="wav").run(overwrite_output=True)
        #     audio_path_to_use = temp_wav_path  # Use the converted file
        # else:
        #     audio_path_to_use = temp_audio_path  # Use the original file
        # Convert audio to WAV using soundfile
        # with audioread.audio_open(temp_audio_path) as src:
        #     audio_data = np.concatenate([np.frombuffer(buf, dtype=np.int16) for buf in src])
        #     sf.write(temp_wav_path, audio_data, src.samplerate, format="wav")

       
        
        
        # 🔹 2️⃣ Transcribe audio using OpenAI Whisper
        # with open(audio_path_to_use, "rb") as audio_file:
        # with open(temp_wav_path, "rb") as audio_file:
        #     transcription = openai_client.audio.transcriptions.create(
        #         model="whisper-1",
        #         file=audio_file,
        #         language="vi",
        #     )
        

        if not transcription.text:
            raise HTTPException(status_code=400, detail="No speech detected in the audio.")

        original_text = transcription.text.strip()

        # 🔹 3️⃣ Translate to English using GPT-4
        translation_response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "Translate the following Vietnamese text to English."},
                {"role": "user", "content": original_text},
            ],
        )
        translated_text = translation_response.choices[0].message.content.strip()

        # 🔹 4️⃣ Generate speech using ElevenLabs API
        tts_audio_generator = elevenlabs_client.text_to_speech.convert(
            voice_id="21m00Tcm4TlvDq8ikWAM",
            output_format="mp3_44100_64", # "mp3_44100_128",
            text=translated_text,
            model_id="eleven_flash_v2_5",
        )

        # tts_audio_bytes = b"".join(tts_audio_generator)

        # # ✅ Save the audio file temporarily
        # audio_filename = f"/tmp/{uuid.uuid4()}.mp3"
        # with open(audio_filename, "wb") as audio_file:
        #     audio_file.write(tts_audio_bytes)

        
        

        # worked: Collect audio bytes in memory
        # audio_buffer = BytesIO()
        # for chunk in tts_audio_generator:
        #     audio_buffer.write(chunk)
        # audio_buffer.seek(0)

        # # Convert to base64 for response
        # audio_base64 = base64.b64encode(audio_buffer.getvalue()).decode()

        # Generate unique filename for the audio
        filename = f"{uuid.uuid4()}.mp3"
        
        # Collect audio bytes in memory
        audio_buffer = BytesIO()
        for chunk in tts_audio_generator:
            audio_buffer.write(chunk)
        audio_buffer.seek(0)

        # Store the audio buffer in memory for streaming
        app.state.audio_buffers = getattr(app.state, 'audio_buffers', {})
        app.state.audio_buffers[filename] = audio_buffer.getvalue()

        return JSONResponse(
            content={
                # "audioUrl": f"/api/py/audio/{audio_filename.split('/')[-1]}",
                "audioUrl": f"/api/py/audio/{filename}",
                # "audio": audio_base64,
                "originalText": original_text,
                "translatedText": translated_text,
            }
        )

    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# worked tmp    
# @app.get("/api/py/audio/{filename}")
# async def get_audio(filename: str):
#     file_path = f"/tmp/{filename}"
#     return FileResponse(file_path, media_type="audio/mpeg", filename="translated_speech.mp3")

# @app.get("/api/py/audio/{filename}")
# async def get_audio(filename: str):
#     file_path = f"/tmp/{filename}"
#     return FileResponse(
#         file_path,
#         media_type="audio/mpeg",
#         headers={
#             "Content-Disposition": 'inline; filename="translated_speech.mp3"',
#             "Cache-Control": "no-cache",
#         }
#     )

@app.get("/api/py/audio/{filename}")
async def get_audio(filename: str):
    """Stream audio from memory."""
    try:
        # Get audio bytes from memory
        audio_bytes = app.state.audio_buffers.get(filename)
        if not audio_bytes:
            raise HTTPException(status_code=404, detail="Audio not found")

        def iter_audio():
            buffer = BytesIO(audio_bytes)
            while chunk := buffer.read(8192):  # Stream in 8KB chunks
                yield chunk

        return StreamingResponse(
            iter_audio(),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": 'inline; filename="translated_speech.mp3"',
                "Accept-Ranges": "bytes",
                "Cache-Control": "no-cache",
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error streaming audio: {str(e)}")
    
# @app.get("/api/py/audio/{filename}")
# async def get_audio(filename: str):
#     file_path = f"/tmp/{filename}"

#     def iter_audio():
#         with open(file_path, "rb") as audio_file:
#             yield from audio_file

#     return StreamingResponse(
#         iter_audio(),
#         media_type="audio/mpeg",
#         headers={
#             "Content-Disposition": 'inline; filename="translated_speech.mp3"',
#             "Accept-Ranges": "bytes",  # ✅ Allows Safari to request partial audio files
#             "Cache-Control": "no-cache",
#         }
#     )

# @app.get("/api/py/audio/stream")
# async def stream_audio(audio_base64: str):
#     """Stream audio from base64 string."""
#     try:
#         # Decode base64 to bytes
#         audio_bytes = base64.b64decode(audio_base64)
#         audio_buffer = BytesIO(audio_bytes)

#         def iter_audio():
#             audio_buffer.seek(0)
#             while chunk := audio_buffer.read(8192):  # Stream in 8KB chunks
#                 yield chunk

#         return StreamingResponse(
#             iter_audio(),
#             media_type="audio/mpeg",
#             headers={
#                 "Content-Disposition": 'inline; filename="translated_speech.mp3"',
#                 "Accept-Ranges": "bytes",
#                 "Cache-Control": "no-cache",
#             }
#         )

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error streaming audio: {str(e)}")