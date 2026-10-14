"""Initialize models."""

MODELS = [
    {
        "model": "echo-1",
        "api_url": "http://localhost:8000/api/v1/chat/completions",
    },
    {"model": "llama3.2:3b", "api_url": "http://localhost:11434/v1/chat/completions"},
]
