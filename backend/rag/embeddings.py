import ollama
from rag.runtime import KEEP_ALIVE

def get_embedding(text):
    response = ollama.embed(
        model="nomic-embed-text",
        input=text,
        keep_alive=KEEP_ALIVE
    )
    return response["embeddings"][0]
