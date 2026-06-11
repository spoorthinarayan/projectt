import os
from sentence_transformers import CrossEncoder

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

model = CrossEncoder(
    "BAAI/bge-reranker-base",
    local_files_only=True
)

def rerank(question, chunks):

    pairs = [
        [question, chunk["text"]]
        for chunk in chunks
    ]

    scores = model.predict(pairs)

    for chunk, score in zip(
        chunks,
        scores
    ):
        chunk["score"] = float(score)

    chunks.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    return chunks[:3]
