import os
import chromadb
from rag.embeddings import get_embedding

# ----------------------------
# DB PATH (DO NOT CHANGE)
# ----------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "chroma_db")

client = chromadb.PersistentClient(path=DB_PATH)

collection = client.get_or_create_collection(
    name="textbook"
)

# ----------------------------
# SEARCH FUNCTION (FIXED)
# ----------------------------
def search_similar(query, k=3):

    query_embedding = get_embedding(query)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=k,
        include=["documents", "metadatas"]
    )

    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]

    output = []

    for i in range(len(docs)):
        output.append({
            "text": docs[i],
            "page": metas[i].get("page", None) if metas else None,
            "score": 1.0  # fallback score
        })

    return output
# ----------------------------
# COMPATIBILITY FUNCTION
# ----------------------------
def retrieve(query, k=3):
    return search_similar(query, k)


# ----------------------------
# DEBUG
# ----------------------------
def debug_collection():
    count = collection.count()
    print(f"[DEBUG] Stored chunks in DB: {count}")
    return count
