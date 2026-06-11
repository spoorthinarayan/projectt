from rag.search import search
from rag.validator import validate_search
from rag.generator import generate_answer
from rag.more_info import more_information
from rag.cache import get_cached, set_cache

import time


def ask_question(question):

    start = time.time()

    result = search(question)

    print(
        "Search Time:",
        round(time.time() - start, 2),
        "seconds"
    )

    valid = validate_search(result)

    if not valid:

        return {
            "success": False,
            "answer": "Question is outside the textbook."
        }

    cached = get_cached(question, result["context"])

    if cached:
        print("Generation Time:", 0.0, "seconds (cache)")
        return {
            "success": True,
            "answer": cached["answer"],
            "pages": cached["pages"]
        }

    start = time.time()

    answer = generate_answer(
        question,
        result["context"]
    )

    print(
        "Generation Time:",
        round(time.time() - start, 2),
        "seconds"
    )

    set_cache(
        question,
        result["context"],
        {
            "answer": answer,
            "pages": result["pages"]
        }
    )

    return {
        "success": True,
        "answer": answer,
        "pages": result["pages"]
    }


def ask_more_information(question):

    start = time.time()

    result = search(question)

    print(
        "Search Time:",
        round(time.time() - start, 2),
        "seconds"
    )

    valid = validate_search(result)

    if not valid:

        return {
            "success": False,
            "answer": "Question is outside the textbook."
        }

    start = time.time()

    answer = more_information(
        question,
        result["context"]
    )

    print(
        "Generation Time:",
        round(time.time() - start, 2),
        "seconds"
    )

    return {
        "success": True,
        "answer": answer,
        "pages": result["pages"]
    }
