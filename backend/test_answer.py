from rag.search import search
from rag.generator import generate_answer

while True:

    question = input("\nQuestion: ")

    print("Searching...")

    result = search(question)

    if result["outside"]:
        print("Question is outside the textbook.")
        continue

    print("Generating answer...")

    answer = generate_answer(
        question,
        result["context"]
    )

    print("\nAnswer:\n")
    print(answer)