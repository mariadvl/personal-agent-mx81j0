# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV CONFIG_DIR=/app/config
ENV DATA_DIR=/app/data
ENV LOG_DIR=/app/logs
ENV PORT=8000

# Set the working directory to /app
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y build-essential curl git libgomp1 ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create necessary directories
RUN mkdir -p ${DATA_DIR} ${CONFIG_DIR} ${LOG_DIR}

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code into the container
COPY . .

# Make port 8000 available to the world outside this container
EXPOSE ${PORT}

# Define a health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s \
    CMD curl --fail http://localhost:8000/api/health || exit 1

# Run the FastAPI application
CMD python -m uvicorn main:app --host 0.0.0.0 --port ${PORT} --reload