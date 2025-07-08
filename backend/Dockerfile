# Use Python 3.12 Alpine image as base
FROM python:3.12-alpine

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies for audio processing and ML libraries
RUN apk add --no-cache \
    build-base \
    cmake \
    pkgconfig \
    libffi-dev \
    openssl-dev \
    ffmpeg \
    libsndfile \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install Python dependencies using uv
RUN pip install uv && \
    uv pip install --system -e .

# Copy application code
COPY app/ ./app/

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 