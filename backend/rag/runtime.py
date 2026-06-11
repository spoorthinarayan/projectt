import ollama

KEEP_ALIVE = "30m"


def warm_models():
    try:
        ollama.embed(
            model="nomic-embed-text",
            input="warmup",
            keep_alive=KEEP_ALIVE
        )
    except Exception:
        pass

    try:
        ollama.chat(
            model="llama3.2:3b",
            messages=[{"role": "user", "content": "warmup"}],
            options={
                "temperature": 0,
                "num_predict": 1
            },
            keep_alive=KEEP_ALIVE
        )
    except Exception:
        pass
