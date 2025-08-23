# Transcription Service

A FastAPI-based transcription service using NVIDIA's Parakeet model for speech-to-text conversion.

## Features

- FastAPI web service for audio transcription
- Uses NVIDIA's Parakeet TDT 0.6B v2 model
- RESTful API endpoints
- Automatic model loading on startup
- Health check endpoints
- CORS support

## Requirements

- Python 3.12+
- CUDA-compatible GPU (recommended for optimal performance)
- Sufficient RAM for model loading (~2GB+)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd transcription-service
```

2. Install dependencies:

```bash
# Using pip
pip install -r requirements.txt

# Or using uv (recommended)
uv sync
```

## Usage

### Running the Service

You can start the service in several ways:

1. **Using the run script:**

```bash
python run.py
```

2. **Using uvicorn directly:**

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

3. **Using the module:**

```bash
python -m app.main
```

The service will be available at:

- API: http://localhost:8000
- Interactive docs: http://localhost:8000/docs
- OpenAPI spec: http://localhost:8000/openapi.json

### API Endpoints

#### Health Check

```bash
GET /health
```

Returns service status and model loading state.

#### Status

```bash
GET /status
```

Simple health check endpoint.

#### Transcribe Audio

```bash
POST /transcribe
Content-Type: application/octet-stream

<audio_bytes>
```

Transcribes audio data and returns the text.

**Response:**

```json
{
  "text": "transcribed text here",
  "success": true
}
```

### Example Usage

#### Using curl

```bash
# Check service health
curl http://localhost:8000/health

# Transcribe audio file
curl -X POST http://localhost:8000/transcribe \
  -H "Content-Type: application/octet-stream" \
  --data-binary @audio_file.wav
```

#### Using Python

```python
import requests

# Transcribe audio
with open("audio_file.wav", "rb") as f:
    audio_data = f.read()

response = requests.post(
    "http://localhost:8000/transcribe",
    data=audio_data,
    headers={"Content-Type": "application/octet-stream"}
)

result = response.json()
print(f"Transcribed text: {result['text']}")
```

## Audio Format

The service expects audio data in the following format:

- Raw PCM audio bytes
- 16-bit signed integer format
- The audio data should be sent as raw bytes in the request body

## Development

### Running Tests

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest
```

### Code Structure

```
transcription-service/
├── app/
│   └── main.py          # FastAPI application
├── parakeet.py          # Original Modal implementation
├── run.py               # Service runner script
├── requirements.txt     # Python dependencies
├── pyproject.toml       # Project configuration
└── README.md           # This file
```

## Performance Notes

- The model is loaded once on startup and kept in memory
- First transcription request may take longer due to model initialization
- GPU acceleration is recommended for optimal performance
- The service uses async/await for non-blocking operations

## Troubleshooting

### Model Loading Issues

- Ensure you have sufficient RAM (2GB+ recommended)
- Check that CUDA is properly installed if using GPU
- Verify nemo-toolkit installation: `pip install nemo-toolkit[asr]`

### Audio Format Issues

- Ensure audio is in the correct format (16-bit PCM)
- Check that audio data is being sent as raw bytes
- Verify Content-Type header is set to `application/octet-stream`

## License

[Add your license information here]
