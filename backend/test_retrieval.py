from rag.search import search

while True:

    question = input(
        "\nQuestion: "
    )

    result = search(
        question
    )

    print("\nResult:\n")

    print(result)