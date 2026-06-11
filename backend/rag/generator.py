import re

import ollama
from rag.runtime import KEEP_ALIVE


def clean_context(chunks, question):
    """
    Basic safety filter to remove unrelated chunks.
    Prevents mixing unrelated textbook sections.
    """

    if not chunks:
        return ""

    if isinstance(chunks, str):
        chunk_list = [
            part.strip()
            for part in re.split(r"\n\s*\n", chunks)
            if part.strip()
        ]
    else:
        chunk_list = [chunk for chunk in chunks if chunk]

    if not chunk_list:
        return ""

    q_words = set(extract_keywords(question))
    filtered = []

    for chunk in chunk_list:
        text = chunk.lower()
        score = sum(1 for word in q_words if word in text)

        if score >= 1:
            filtered.append(chunk)

    if not filtered:
        filtered = [chunk_list[0]]

    return "\n\n".join(filtered[:5])


def format_answer(answer):
    answer = answer.replace("\r\n", "\n").strip()
    answer = re.sub(r"\n{3,}", "\n\n", answer)
    answer = re.sub(r"(KEY POINTS:)\s*", r"\1\n", answer)
    answer = re.sub(r"(SIMPLE EXPLANATION:)\s*", r"\1\n", answer)
    answer = re.sub(r"(?<!\n)- ", r"\n- ", answer)
    return answer.strip()


def split_questions(question):
    text = " ".join(question.strip().split())

    if "?" in text:
        parts = [
            part.strip(" ,")
            for part in re.split(r"\?\s*", text)
            if part.strip(" ,")
        ]
        if len(parts) > 1:
            return parts

    marked = re.sub(
        r"\s+(?:and|&)\s+(?=(?:what|which|who|when|where|why|how)\b)",
        " ||| ",
        text,
        flags=re.IGNORECASE
    )
    parts = [
        part.strip(" ,")
        for part in marked.split("|||")
        if part.strip(" ,")
    ]

    return parts if len(parts) > 1 else [text]


def extract_keywords(text):
    stopwords = {
        "a", "an", "and", "are", "at", "be", "by", "for", "from",
        "how", "in", "is", "it", "of", "on", "or", "that", "the",
        "to", "what", "when", "where", "which", "who", "why", "with"
    }
    return [
        word for word in re.findall(r"[a-zA-Z]+", text.lower())
        if len(word) > 2 and word not in stopwords
    ]


def select_relevant_context(question, context):
    sections = [
        section.strip()
        for section in re.split(r"\n\s*\n", context)
        if section.strip()
    ]

    if not sections:
        return context[:2000]

    keywords = extract_keywords(question)

    if not keywords:
        return "\n\n".join(sections[:2])[:2000]

    scored = []

    for section in sections:
        lowered = section.lower()
        score = sum(1 for word in keywords if word in lowered)

        if "side effect" in question.lower() or "adverse effect" in question.lower():
            if "adverse effect" in lowered or "side effect" in lowered:
                score += 3
            if "hypotension" in lowered or "dyspnea" in lowered or "flushing" in lowered:
                score += 1

        scored.append((score, section))

    scored = [item for item in scored if item[0] > 0]

    if not scored:
        return "\n\n".join(sections[:2])[:2000]

    scored.sort(key=lambda item: item[0], reverse=True)
    return "\n\n".join(section for _, section in scored[:2])[:2200]


def build_prompt(question, context, multiple, questions=None):
    if multiple:
        question_lines = "\n".join(
            f"QUESTION {index}: {item}"
            for index, item in enumerate(questions or [], 1)
        )
        return f"""
You are a STRICT medical textbook assistant.

Use ONLY the textbook content below.
Do NOT add outside medical knowledge.
Do NOT guess.

The input contains multiple questions.
Answer every question separately in the same order.
If one question is not clearly answered in the textbook, write exactly:
Question is outside the textbook.

For any question asking for the "most common", "main", or "specific" answer:
only give that answer if the textbook context explicitly states it.
Otherwise write:
Not clearly mentioned in textbook.

FORMAT:
QUESTION 1:
KEY POINTS:
- fact from textbook

SIMPLE EXPLANATION:
- simple explanation

QUESTION 2:
KEY POINTS:
- fact from textbook

SIMPLE EXPLANATION:
- simple explanation

TEXTBOOK:
{context}

QUESTIONS:
{question_lines}

ANSWER:
"""

    extra_rule = ""
    lowered = question.lower()

    if "side effect" in lowered or "adverse effect" in lowered:
        extra_rule = """
List only the side effects explicitly mentioned in the textbook context.
If multiple side effects are listed there, include all of them.
Do not shorten the list to just one or two examples.
"""

    if "difference between" in lowered or lowered.startswith("compare "):
        extra_rule += """
For comparison questions, compare the topics using only textbook facts in the context.
You do not need an explicit sentence saying "the difference is".
If both topics are described, explain the practical differences in simple language.
"""

    return f"""
You are a STRICT medical textbook assistant.

Use ONLY the textbook content below.
Do NOT add outside medical knowledge.
Do NOT guess.

If the textbook does not clearly answer the question, write exactly:
Question is outside the textbook.

For questions asking for the "most common", "main", or "specific" answer:
only give that answer if the textbook context explicitly states it.
Otherwise write exactly:
Not clearly mentioned in textbook.

{extra_rule}

FORMAT:
KEY POINTS:
- only relevant textbook facts

SIMPLE EXPLANATION:
- easy explanation in daily language
- explain medical terms in brackets if needed

TEXTBOOK:
{context}

QUESTION:
{question}

ANSWER:
"""


def generate_answer(question, context_chunks):
    context = clean_context(context_chunks, question)
    questions = split_questions(question)

    if len(questions) > 1:
        focused_context = "\n\n".join(
            select_relevant_context(single_question, context)
            for single_question in questions
        )[:2600]
    else:
        focused_context = select_relevant_context(question, context)[:2200]

    prompt = build_prompt(
        question=question,
        context=focused_context,
        multiple=len(questions) > 1,
        questions=questions
    )

    response = ollama.chat(
        model="llama3.2:3b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        options={
            "temperature": 0,
            "top_p": 0.1
        },
        keep_alive=KEEP_ALIVE
    )

    return format_answer(response["message"]["content"])
