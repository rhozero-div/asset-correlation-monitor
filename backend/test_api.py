import httpx

r = httpx.get("http://localhost:8000/api/v1/health")
print(r.json())
