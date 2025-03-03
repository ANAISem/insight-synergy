from ratelimit import limits, sleep_and_retry
from pybreaker import CircuitBreaker
import requests
import redis
import json
from config import MistralConfig

cache = redis.Redis(host='localhost', port=6379, db=0)

breaker = CircuitBreaker(fail_max=5, reset_timeout=60)

def get_analysis_from_cache(request_id):
    cached_result = cache.get(request_id)
    if cached_result:
        return json.loads(cached_result)
    return None

def set_analysis_to_cache(request_id, result, ttl=3600):
    cache.setex(request_id, ttl, json.dumps(result))

@sleep_and_retry
@limits(calls=60, period=60)
@breaker
def call_mistral_api(payload):
    request_id = payload.get("request_id")
    cached_result = get_analysis_from_cache(request_id)
    if cached_result:
        return cached_result

    try:
        response = requests.post(MistralConfig.API_URL, headers=MistralConfig.headers(), json=payload)
        response.raise_for_status()
        result = response.json()
        set_analysis_to_cache(request_id, result)
        return result
    except requests.RequestException as e:
        return {"status": "error", "message": "Fallback-Ergebnis aufgrund eines API-Fehlers."} 