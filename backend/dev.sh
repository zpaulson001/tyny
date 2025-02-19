# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)

uvicorn app.main:app --port $PORT --reload