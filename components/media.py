import os
from typing import Optional

import streamlit as st


def _list_media_files(run_dir: str) -> list[str]:
    exts = {
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".gif",
        ".mp4",
        ".mov",
        ".webm",
        ".mkv",
    }
    # Flat strategy: `run_dir` is actually `${outputs_dir}/${run_id}`.
    # Generated media lives flat as `${outputs_dir}/{run_id}.output.<ext}`.
    # So when a caller passes `run_dir`, list media files matching `<run_id>.output.*`.
    run_id = os.path.basename(run_dir.rstrip(os.sep))
    base_dir = os.path.dirname(run_dir)
    try:
        names = os.listdir(base_dir)
    except FileNotFoundError:
        return []

    out: list[str] = []
    prefix = f"{run_id}.output."
    for n in sorted(names):
        if not n.startswith(prefix):
            continue
        p = os.path.join(base_dir, n)
        if os.path.isfile(p) and os.path.splitext(n)[1].lower() in exts:
            out.append(p)
    return out


def _first_media_path(run_dir: str) -> Optional[str]:
    files = _list_media_files(run_dir)
    return files[0] if files else None


def _media_kind(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    if ext in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
        return "image"
    if ext in {".mp4", ".mov", ".webm", ".mkv"}:
        return "video"
    return "unknown"


def _maybe_preview(path: str) -> None:
    kind = _media_kind(path)
    if kind == "image":
        st.image(path)
    elif kind == "video":
        st.video(path)
    else:
        st.write(f"Preview not supported for: {path}")
