FROM python:3.11-slim

# Install system dependencies for build and postgres
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Copy requirements first to leverage Docker cache
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend files
COPY backend/ /workspace/backend/

# Set working directory to backend folder for running the application
WORKDIR /workspace/backend

EXPOSE 8000

# Start command utilizing Render's dynamic PORT environment variable
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
