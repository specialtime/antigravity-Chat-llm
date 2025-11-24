# Antigravity - LLM Chat Application

Antigravity is a modern, full-stack chat application designed for interacting with Large Language Models (LLMs). It features a polished, responsive React frontend and a robust FastAPI backend, capable of connecting to local LLMs (e.g., via LM Studio) or OpenAI-compatible APIs.

## 🚀 Features

- **Real-time Chat:** Seamless interaction with LLMs with streaming responses.
- **Rich UI/UX:** Aesthetically pleasing interface built with Tailwind CSS and Framer Motion.
- **Markdown Support:** Renders LLM responses with Markdown, including code blocks and tables.
- **Thought Process Visibility:** Special handling for `<think>` tags, collapsed by default and expandable by the user.
- **Performance Monitoring:** Visual "traffic light" system to indicate LLM response latency.
- **User Authentication:** Secure signup and login with JWT-based authentication.
- **Customizable LLM Settings:** Adjust `Temperature` and `Top P` parameters per conversation or set global defaults.
- **Extensible Backend:** Built with FastAPI for high performance and easy extension.

## 🛠️ Tech Stack

### Frontend
- **Framework:** React (Vite)
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Markdown:** React Markdown, Remark GFM

### Backend
- **Framework:** FastAPI
- **Server:** Uvicorn
- **LLM Integration:** OpenAI SDK (compatible with local models)
- **Validation:** Pydantic


## 📦 Database Persistence

The application stores conversations and messages in a SQLite database (or the configured DB). The `Conversation` and `Message` models are defined in `backend/models.py`.

- **Users:** User data and preferences are stored in the `users` table.
- **Conversations:** Linked to specific users via `user_id`.
- **Messages:** Linked to conversations.

This ensures that chat history is isolated and persistent for each user.

## 📡 API Endpoints

- **POST `/api/auth/register`**: Register a new user with email, password, and optional default settings.
- **POST `/api/auth/login`**: Authenticate and receive a JWT access token.
- **GET `/api/auth/me`**: Retrieve current user profile and default settings.

- **POST `/api/chat`**: Sends a user message and receives a streaming response. Accepts `message`, optional `history`, and optional `conversation_id`. Returns a Server‑Sent Events stream with assistant content and a final metadata event containing `conversation_id` and `response_time`.

- **GET `/api/conversations`**: Retrieves a list of recent conversations with `id`, `title`, and `created_at`.

- **GET `/api/conversations/{conversation_id}`**: Retrieves the full message history for a specific conversation, including `role`, `content`, and `response_time`.

These endpoints are documented in the OpenAPI UI at `http://localhost:8000/docs`.

## 📋 Prerequisites

- **Node.js** (v18+ recommended)
- **Python** (v3.10+ recommended)
- **LLM Provider:** A running instance of LM Studio (for local models) or access to an OpenAI-compatible API.

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd antigravity
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the backend server:

```bash
uvicorn main:app --reload
```

The backend will be available at `http://localhost:8000`. API documentation is available at `http://localhost:8000/docs`.

### 3. Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`.

## 🔧 Configuration

### Backend
The backend uses `python-dotenv` for configuration. Copy `backend/.env.example` to `backend/.env` and update it with your provider values. The server will refuse to start if `LLM_BASE_URL` or `LLM_API_KEY` are missing.

Example `.env`:
```env
# Example configuration for local LM Studio
LLM_BASE_URL="http://localhost:1234/v1"
LLM_API_KEY="lm-studio"

# Auth Configuration
AUTH_SECRET_KEY="change-me-in-production"
AUTH_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=60

```

## 📂 Project Structure

```
antigravity/
├── backend/            # FastAPI backend
│   ├── api/            # API routes
│   ├── services/       # Business logic & LLM services
│   ├── tests/          # Python tests
│   ├── main.py         # Application entry point
│   └── requirements.txt
│
└── frontend/           # React frontend
    ├── src/            # Source code
    ├── public/         # Static assets
    ├── index.html      # HTML entry point
    ├── package.json    # Frontend dependencies
    └── vite.config.js  # Vite configuration
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
