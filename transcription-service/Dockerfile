# Use Python 3.12 slim image as base
FROM nvidia/cuda:12.9.1-cudnn-devel-ubuntu24.04
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV HF_HUB_ENABLE_HF_TRANSFER="1"
ENV HF_HOME="/cache"
ENV DEBIAN_FRONTEND="noninteractive"
ENV CXX="g++"
ENV CC="g++"

# Install system dependencies for audio processing and ML libraries
RUN apt-get update && apt-get install -y \
    python3 \
    python3-dev \
    build-essential \
    cmake \
    pkg-config \
    libffi-dev \
    libssl-dev \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for python command
RUN ln -sf /usr/bin/python3 /usr/bin/python



# Set working directory
WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./

RUN uv sync --locked

# Copy application code
COPY app/ ./app/

# Expose port
EXPOSE 8000

# Run the application
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"] 