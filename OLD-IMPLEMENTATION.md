# Previous Python Implementation (Streamlit)

This document summarizes the architecture and functionality of the original Python implementation that preceded the React SPA.

## Overview
The original project was a **Streamlit**-based web application designed to interface with the Pruna AI API. It allowed users to perform image editing, video generation, and manage a local gallery of generated assets.

## Core Components

### API Client (`client.py`)
A custom `PApiClient` was implemented using `requests` to handle all communication with `api.pruna.ai`.
- **Functionality**:
    - `create_prediction`: Initial request to trigger an AI task.
    - `get_prediction_status`: Polling mechanism to track task progress.
    - `download_generation`: Fetching final assets from the API.
    - `run_prediction_async`: A high-level convenience helper that coordinates creation, polling, and download.

### Web UI (`app.py`)
Streamlit was used to build a rapid-prototype interface.
- **Routing**: Sidebar-based navigation between:
    - **Image Editing**: Form-based input for prompt, aspect ratio, seed, etc.
    - **Video Generation**: Form-based input for video tasks.
    - **Gallery**: A history view scanning local storage.

### Functional Components (`components/`)
The application logic was modularized into several Python scripts:
- `forms_image.py` & `forms_video.py`: Handled form rendering and submission logic.
- `storage.py`: Managed local file-based storage for task metadata and binary assets.
- `media.py`: Provided helpers for asset previewing and path management.
- `workflow.py`: Abstracted the higher-level prediction lifecycle.

## Data Storage
The Python app used a local filesystem structure for persistence:
- **Directory**: `outputs/`
- **Structure**: Each run was stored in a subdirectory named after its `prediction_id` (or a timestamped run ID).
- **Files**:
    - `metadata.json`: Captured task parameters and API response metadata.
    - `output.<ext>`: The actual generated image or video.

## Tech Stack
- **Languages**: Python (>= 3.14)
- **Framework**: Streamlit
- **Package Manager**: uv
- **Linting/Types**: Ruff, BasedPyright
- **Networking**: python-dotenv, requests
