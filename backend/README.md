Medical Textbook AI Assistant

A Retrieval-Augmented Generation (RAG) based medical question-answering system that provides answers strictly from a medical textbook. The application uses semantic search, reranking, and a local LLM to generate accurate, textbook-grounded responses in simple, understandable language.

Features

Medical Question Answering

- Ask questions in natural language.
- Answers are generated only from textbook content.
- Context-aware retrieval using semantic search.
- Textbook page references displayed with answers.
- "More Info" option for additional textbook details.
- Simple explanations for complex medical concepts.

Retrieval-Augmented Generation (RAG)

- ChromaDB vector database.
- SentenceTransformer embeddings.
- Reranking for improved relevance.
- Context filtering to reduce hallucinations.
- Cached responses for faster repeated questions.

Frontend Features

- Modern ChatGPT-style interface.
- Multiple chat conversations.
- Create new chats.
- Rename chat sessions.
- Search previous chats.
- Persistent conversation history.
- Copy answers with one click.
- Export chat conversations.
- Delete individual questions.
- Delete complete chat sessions.
- Responsive design for desktop and mobile.
- Loading indicators while AI is generating responses.
- Source page references displayed with answers.

Backend Features

- FastAPI backend.
- ChromaDB vector storage.
- Ollama local LLM integration.
- Cached responses for improved speed.
- REST API architecture.
- PDF/Textbook ingestion pipeline.
- Text chunk retrieval and reranking.

Project Structure

projectt/

backend/

- main.py
- cache.py
- ingest.py
- requirements.txt
- rag/
  - retriever.py
  - search.py
  - reranker.py

frontend/

- public/
- src/
  - App.js
  - App.css
  - api.js

uploads/

- Medical textbook files

chroma_db/

- Vector database

README.md

.gitignore

Technology Stack

Frontend

- React.js
- Axios
- React Icons

Backend

- FastAPI
- Uvicorn
- ChromaDB
- SentenceTransformers
- Ollama
- PyMuPDF
- Transformers
- Torch

Installation

Backend

Install dependencies:

pip install -r requirements.txt

Run backend:

python -m uvicorn main:app --reload

Backend URL:

http://127.0.0.1:8000

Frontend

Install dependencies:

npm install

Start frontend:

npm start

Frontend URL:

http://localhost:3000

Workflow

1. Textbook content is ingested and stored in ChromaDB.
2. User asks a question.
3. Relevant textbook chunks are retrieved.
4. Results are reranked.
5. Context is sent to the LLM.
6. AI generates a textbook-grounded answer.
7. Sources and page numbers are displayed.

Example Questions

- What is Intracardiac Echocardiography (ICE)?
- Explain the risk-treatment paradox.
- What is Number Needed to Treat (NNT)?
- How does respiration affect cardiac murmurs?
- What are the contraindications of IABP?

Future Enhancements

- Voice input.
- PDF upload from UI.
- User authentication.
- Cloud deployment.
- Multi-textbook support.
- Bookmark important answers.
- Dark mode.
- Answer feedback system.

License

This project is intended for educational and research purposes.