from rag.qa_service import ask_question

while True:

    question = input(
        "\nQuestion: "
    )

    result = ask_question(
        question
    )

    print("\n")

    print(result)