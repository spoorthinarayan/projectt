import ollama
from rag.cache import get_cached, set_cache
from rag.runtime import KEEP_ALIVE

def more_information(question, context):

    context = context[:3000]

    cached = get_cached(question + "_more", context)
    if cached:
        return cached

    prompt = f"""
You are a medical assistant.

Explain clearly using ONLY textbook content.

- Simple language
- No hallucination
- No extra examples
- Keep 6–8 lines max

TEXTBOOK:
{context}

QUESTION:
{question}

ANSWER:
"""

    response = ollama.chat(
        model="llama3.2:3b",
        messages=[{"role": "user", "content": prompt}],
        options={"temperature": 0},
        keep_alive=KEEP_ALIVE
    )

    answer = response["message"]["content"]

    set_cache(question + "_more", context, answer)

    return answer
