import re

from rag.retriever import search_similar
from rag.reranker import rerank

THRESHOLD = 0.3
STOPWORDS = {
    "a", "an", "and", "are", "at", "do", "does", "for",
    "get", "gets", "how", "if", "in", "is", "of", "on",
    "or", "person", "the", "to", "what", "when", "where",
    "who", "why", "with"
}
GENERIC_KEYWORDS = {
    "pain", "problem", "issue", "symptom", "person",
    "people", "thing", "things", "help", "what", "how"
}
QUERY_ALIASES = {
    "ice": "intracardiac echocardiography ice",
    "hocm": "hypertrophic obstructive cardiomyopathy hcm hocm",
    "hcm": "hypertrophic cardiomyopathy hcm",
}


def normalize_question(question):
    normalized = question

    for term, expansion in QUERY_ALIASES.items():
        normalized = re.sub(
            rf"\b{re.escape(term)}\b",
            expansion,
            normalized,
            flags=re.IGNORECASE
        )

    return normalized


def extract_subqueries(question):
    normalized = normalize_question(question)
    lowered = normalized.lower()

    patterns = [
        r"difference between\s+(.+?)\s+and\s+(.+)",
        r"compare\s+(.+?)\s+and\s+(.+)",
    ]

    for pattern in patterns:
        match = re.search(pattern, lowered, flags=re.IGNORECASE)
        if match:
            return [
                match.group(1).strip(),
                match.group(2).strip(),
            ]

    return []


def merge_chunks(*chunk_groups):
    merged = []
    seen = set()

    for group in chunk_groups:
        for chunk in group:
            key = (
                chunk.get("page"),
                chunk.get("text", "")
            )

            if key in seen:
                continue

            seen.add(key)
            merged.append(chunk)

    return merged


def extract_keywords(question):
    words = re.findall(r"[a-zA-Z]+", normalize_question(question).lower())
    return [
        word for word in words
        if len(word) > 2 and word not in STOPWORDS
    ]


def keyword_coverage(question, chunks):
    keywords = extract_keywords(question)

    if not keywords or not chunks:
        return 0.0

    combined = " ".join(
        chunk.get("text", "").lower()
        for chunk in chunks[:3]
    )

    matched = [
        word for word in keywords
        if word in combined
    ]

    strong_keywords = [
        word for word in keywords
        if word not in GENERIC_KEYWORDS
    ]

    strong_matches = [
        word for word in strong_keywords
        if word in combined
    ]

    if strong_keywords and not strong_matches:
        return 0.0

    return len(matched) / len(keywords)


def search(question):
    normalized_question = normalize_question(question)
    chunks = search_similar(normalized_question, k=12)

    subqueries = extract_subqueries(question)
    comparison_ranked = []
    if subqueries:
        comparison_chunks = []

        for subquery in subqueries:
            subquery_chunks = search_similar(subquery, k=6)
            comparison_chunks.append(subquery_chunks)
            comparison_ranked.extend(
                rerank(subquery, subquery_chunks)[:2]
            )

        chunks = merge_chunks(
            chunks,
            comparison_ranked,
            *comparison_chunks
        )

    if not chunks:
        return {
            "outside": True,
            "context": "",
            "pages": []
        }

    ranked = rerank(normalized_question, chunks)

    if not ranked:
        return {
            "outside": True,
            "context": "",
            "pages": []
        }

    if comparison_ranked:
        ranked = merge_chunks(comparison_ranked, ranked)

    best_score = ranked[0].get("score", 0)
    coverage = keyword_coverage(question, ranked)

    if coverage < 0.6 or (
        best_score < THRESHOLD and coverage < 1.0
    ):
        return {
            "outside": True,
            "context": "",
            "pages": []
        }

    context = "\n\n".join(
        chunk["text"] for chunk in ranked
    )

    pages = list({
        chunk.get("page")
        for chunk in ranked
        if chunk.get("page") is not None
    })

    return {
        "outside": False,
        "context": context,
        "pages": pages
    }
