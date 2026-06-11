import hashlib
import time

# ----------------------------
# IN-MEMORY CACHE
# ----------------------------
CACHE = {}

# optional: store timestamps for expiry
CACHE_TIME = {}

# cache expiry time (optional - 1 hour)
TTL = 60 * 60


# ----------------------------
# CREATE SAFE CACHE KEY
# ----------------------------
def make_key(question, context):
    """
    Creates stable hash key so same question = same cache hit
    """

    if context is None:
        context = ""

    # ensure deterministic ordering
    if isinstance(context, list):
        context = " ".join(context)

    raw = f"{question.strip().lower()}|{context}"

    return hashlib.md5(raw.encode()).hexdigest()


# ----------------------------
# GET FROM CACHE
# ----------------------------
def get_cached(question, context):
    key = make_key(question, context)

    if key in CACHE:
        # check expiry
        if time.time() - CACHE_TIME[key] < TTL:
            return CACHE[key]
        else:
            # expired → delete
            del CACHE[key]
            del CACHE_TIME[key]

    return None


# ----------------------------
# SET CACHE
# ----------------------------
def set_cache(question, context, answer):
    key = make_key(question, context)

    CACHE[key] = answer
    CACHE_TIME[key] = time.time()

    # prevent unlimited memory growth
    if len(CACHE) > 500:
        # remove oldest entry
        oldest_key = min(CACHE_TIME, key=CACHE_TIME.get)
        del CACHE[oldest_key]
        del CACHE_TIME[oldest_key]