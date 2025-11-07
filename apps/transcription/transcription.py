import modal
from pydantic import BaseModel

app = modal.App("opencut-transcription")

class TranscribeRequest(BaseModel):
    filename: str
    language: str = "auto"
    decryptionKey: str = None
    iv: str = None

@app.function(
    image=modal.Image.debian_slim()
        .apt_install(["ffmpeg"])
        .pip_install(["openai-whisper", "boto3", "fastapi[standard]", "pydantic", "cryptography"]),
    gpu="A10G",
    timeout=300, # 5m
    secrets=[modal.Secret.from_name("opencut-r2-secrets")]
)
@modal.fastapi_endpoint(method="POST")
def transcribe_audio(request: TranscribeRequest):
    import whisper
    import boto3
    import tempfile
    import os
    import json
    
    try:
        filename = request.filename
        language = request.language
        decryption_key = request.decryptionKey
        iv = request.iv
        
        if not filename:
            return {
                "error": "Missing filename parameter"
            }
        
        # Initialize R2 client
        s3_client = boto3.client(
            's3',
            endpoint_url=f'https://{os.environ["CLOUDFLARE_ACCOUNT_ID"]}.r2.cloudflarestorage.com',
            aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
            region_name='auto'
        )
        
        # Create temporary file for audio
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            temp_path = temp_file.name
            
            try:
                # Download audio from R2
                s3_client.download_file(
                    os.environ["R2_BUCKET_NAME"], 
                    filename, 
                    temp_path
                )
                
                # If decryption key provided, decrypt the file directly (zero-knowledge)
                if decryption_key and iv:
                    import base64
                    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
                    from cryptography.hazmat.backends import default_backend
                    
                    # Read the encrypted file
                    with open(temp_path, 'rb') as f:
                        encrypted_data = f.read()
                    
                    # Decode the key and IV from base64
                    key_bytes = base64.b64decode(decryption_key)
                    iv_bytes = base64.b64decode(iv)
                    
                    # Decrypt the data using AES-GCM
                    # Extract the tag (last 16 bytes) and ciphertext
                    tag = encrypted_data[-16:]
                    ciphertext = encrypted_data[:-16]
                    
                    cipher = Cipher(
                        algorithms.AES(key_bytes),
                        modes.GCM(iv_bytes, tag),
                        backend=default_backend()
                    )
                    decryptor = cipher.decryptor()
                    decrypted_data = decryptor.update(ciphertext) + decryptor.finalize()
                    
                    # Write decrypted audio back to temp file
                    with open(temp_path, 'wb') as f:
                        f.write(decrypted_data)
                
                # Load Whisper model
                model = whisper.load_model("base")
                
                # Transcribe audio
                if language == "auto":
                    result = model.transcribe(temp_path)
                else:
                    result = model.transcribe(temp_path, language=language.lower())
                
                # Delete audio file from R2 (cleanup)
                s3_client.delete_object(
                    Bucket=os.environ["R2_BUCKET_NAME"],
                    Key=filename
                )
                
                # Adjust segment timing - Whisper is consistently late by ~500ms
                adjusted_segments = []
                for segment in result["segments"]:
                    adjusted_segment = segment.copy()
                    # Shift start/end times earlier by 500ms, don't go below 0
                    adjusted_segment["start"] = max(0, segment["start"] - 0.5)
                    adjusted_segment["end"] = max(0.5, segment["end"] - 0.5)  # Ensure duration is at least 0.5s
                    adjusted_segments.append(adjusted_segment)
                
                return {
                    "text": result["text"],
                    "segments": adjusted_segments,
                    "language": result["language"]
                }
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                    
    except Exception as e:
        import traceback
        print(f"Transcription error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        
        # Return error response that matches expected format
        return {
            "error": str(e),
            "text": "",
            "segments": [],
            "language": "unknown"
        }

@app.local_entrypoint()
def main():
    # Test function - you can call this with modal run transcription.py
    print("Transcription service is ready to deploy!")
    print("Deploy with: modal deploy transcription.py")