def validate_search(search_result):

    if search_result["outside"]:
        return False

    if len(search_result["context"].strip()) < 50:
        return False

    return True