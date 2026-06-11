import os
import fitz
from rag.retriever import add_documents, collection


# ----------------------------
# PATHS
# ----------------------------
PDF_PATH = os.path.join(os.getcwd(), "uploads", "science_textbook.pdf")


# ----------------------------
# CHECK IF ALREADY INGESTED
# ----------------------------
def is_already_ingested():
    try:
        count = collection.count()
        return count > 0
    except:
        return False


# ----------------------------
# LOAD PDF
# ----------------------------
def load_pdf():
    if not os.path.exists(PDF_PATH):
        print(f"[ERROR] PDF not found: {PDF_PATH}")
        return None

    doc = fitz.open(PDF_PATH)
    text = ""

    for page in doc:
        text += page.get_text()

    return text


# ----------------------------
# CHUNK TEXT (ONLY ONCE)
# ----------------------------
def chunk_text(text, size=800):
    words = text.split()
    return [
        " ".join(words[i:i + size])
        for i in range(0, len(words), size)
    ]


# ----------------------------
# MAIN INGEST
# ----------------------------
def main():

    print("\n🚀 INGEST START\n")

    # ⚠️ IMPORTANT: prevent re-embedding
    if is_already_ingested():
        print("⚡ Already ingested. Skipping embedding process.")
        return

    text = load_pdf()

    if not text:
        print("[ERROR] No text extracted")
        return

    chunks = chunk_text(text)

    print(f"[INFO] Creating chunks: {len(chunks)}")

    add_documents(chunks)

    print("\n✅ INGEST COMPLETE (stored in vector DB)\n")


if __name__ == "__main__":
    main()