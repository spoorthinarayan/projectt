from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from rag.qa_service import ask_question, ask_more_information
from rag.runtime import warm_models

app = FastAPI()

# =========================
# CORS FIX (IMPORTANT)
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for development only
    allow_credentials=True,
    allow_methods=["*"],  # allows POST, OPTIONS, etc
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    warm_models()

# =========================
# ASK API
# =========================
@app.post("/ask")
def ask(data: dict):
    question = data["question"]
    return ask_question(question)


# =========================
# MORE INFO API
# =========================
@app.post("/more-info")
def more_info(data: dict):
    question = data["question"]
    return ask_more_information(question)
