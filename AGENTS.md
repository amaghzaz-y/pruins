# AGENTS.md — pruins

## Overview

**pruins** is a Python project/client for the Pruna AI API (`api.pruna.ai`). It wraps prediction and file-delivery workflows and includes an API client in `client.py`.

## Project Metadata

| Key | Value |
|---|---|
| Package manager | `uv` |
| Python | `>=3.14` |
| Lock file | `uv.lock` |
| Config | `pyproject.toml` |

## Default Workflows

```bash
# Install dependencies
uv sync

# Run entrypoint (uses locked env)
uv run main.py

# Run arbitrary code
uv run python -c "print('hi')"
```

## Code & Design Conventions

- Keep API calls centralized in `client.py`.
- Prefer explicit type models (dataclasses) for structured responses.
- Raise rich exceptions for non-2xx responses (see `PApiError`).
- Use `P_API_KEY` (and optionally `.env`) for credentials; avoid hardcoding secrets.

## How to Use the API Client

Core async workflow:
1. `PApiClient().create_prediction(model=..., input_payload=...)`
2. `PApiClient().get_prediction_status(prediction_id=...)` (poll)
3. `PApiClient().download_generation(generation_url=..., dest_path=...)`

Convenience helper:
```python
client.run_prediction_async(
    model="p-image",
    input_payload={"prompt": "...", "aspect_ratio": "16:9", "seed": 42},
    download_to="./outputs",
)
```

## Files

- `client.py`: `PApiClient` implementation
- `main.py`: simple entrypoint
- `p-api.yaml`: OpenAPI 3.0 spec
- `pyproject.toml`: project metadata and dependencies
- `uv.lock`: dependency lock

## Quality Checks

```bash
# Typecheck (uses `ty` via `uvx`)
uvx ty check

# Lint
uvx ruff check .

# Format (if configured)
uvx ruff format .
```
