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

# Run a prediction example (runs `_example()` in `client.py`)
uv run python client.py

# Run arbitrary code
uv run python -c "print('hi')"
```

## Code & Design Conventions

- Keep API calls centralized in `client.py`.
- Prefer explicit type models (dataclasses) for structured responses.
- Raise rich exceptions for non-2xx responses (see `PApiError`).
- Use `P_API_KEY` (and optionally `.env`) for credentials; avoid hardcoding secrets.

## How to Use the API Client

This project provides a real API client in `client.py`.

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

### Prediction workflow details

`PApiClient.run_prediction_async(...)` behaves as follows:

- Polling:
  - calls `get_prediction_status(prediction_id)` repeatedly
  - default `poll_interval_s` is `2.0`
  - considers the prediction successful only when `status.status == "succeeded"`
  - stops and raises `RuntimeError` when `status.status` is `"failed"` or `"canceled"`
  - raises `TimeoutError` after `timeout_s` (default `1200.0`) if neither success nor a terminal failure state is reached

- Download destination convention:
  - `download_generation(...)` is invoked with `dest_path=os.path.join(download_to, pred_id)`
  - when `dest_path` is a directory, `download_generation` writes the generation as `output.<ext>` inside that directory
  - with `download_to="./outputs"`, downloaded files land under:
    - `./outputs/<prediction_id>/output.<ext>`

### Error handling (`PApiError`)

For non-2xx responses, `client.py` raises `PApiError`.

`PApiError` fields:
- `status_code`: HTTP status code
- `error_payload`: parsed JSON error body (or `None` if the body is not JSON)
- `request_id`: request identifier returned by the API (when present)

## Files

- `client.py`: `PApiClient` implementation
- `main.py`: simple entrypoint
- `p-api.yaml`: OpenAPI 3.0 spec
- `pyproject.toml`: project metadata and dependencies
- `uv.lock`: dependency lock

## Quality Checks

```bash
# Format
uvx ruff format .

# Typecheck
uvx ty check

# Lint
uvx ruff check .
```

## Credentials

The API key is read from environment variables.

Set `P_API_KEY` in your environment or a local `.env` file.

Example `.env`:
```bash
P_API_KEY=... 
```

Notes about `.env` loading:
- `client.py` supports loading `.env` via `python-dotenv` **only in the `_example()` path** (where `load_dotenv()` is called).
- `load_dotenv()` loads `.env` from the current working directory by default.
