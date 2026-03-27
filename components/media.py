import os
from typing import Optional

import streamlit as st


def _list_media_files(outputs_dir: str, run_id: str) -> list[str]:
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
    try:
        names = os.listdir(outputs_dir)
    except FileNotFoundError:
        return []

    out: list[str] = []
    # Primary expected format: `${run_id}.output.<ext>` (current flat strategy).
    prefix = f"{run_id}.output."
    for n in sorted(names):
        if n.startswith(prefix):
            p = os.path.join(outputs_dir, n)
            if os.path.isfile(p) and os.path.splitext(n)[1].lower() in exts:
                out.append(p)

    # Legacy/alternative format observed in existing outputs:
    # `${run_id}.<ext>` (no `output.` segment).
    if not out:
        prefix2 = f"{run_id}."
        for n in sorted(names):
            if not n.startswith(prefix2):
                continue
            if not os.path.isfile(os.path.join(outputs_dir, n)):
                continue
            if n.endswith(".metadata.json"):
                continue
            if os.path.splitext(n)[1].lower() in exts:
                out.append(os.path.join(outputs_dir, n))
        out.sort()

    # If Gallery callers pass the real outputs_dir/run_id as `run_dir`, they may
    # have accidentally pointed at a non-existent directory (flat storage).
    # Fall back to scanning the true outputs_dir using the inferred run id.
    if not out:
        inferred_run_id = os.path.basename(outputs_dir.rstrip(os.sep))
        if inferred_run_id and inferred_run_id != run_id:
            prefix2 = f"{inferred_run_id}.output."
            out2: list[str] = []
            for n in sorted(names):
                if not n.startswith(prefix2):
                    continue
                p2 = os.path.join(outputs_dir, n)
                if os.path.isfile(p2) and os.path.splitext(n)[1].lower() in exts:
                    out2.append(p2)
            if not out2:
                prefix2b = f"{inferred_run_id}."
                for n in sorted(names):
                    if not n.startswith(prefix2b):
                        continue
                    if n.endswith(".metadata.json"):
                        continue
                    p2b = os.path.join(outputs_dir, n)
                    if os.path.isfile(p2b) and os.path.splitext(n)[1].lower() in exts:
                        out2.append(p2b)
            return out2
    return out


def _first_media_path(outputs_dir: str, run_id: str) -> Optional[str]:
    files = _list_media_files(outputs_dir, run_id)
    return files[0] if files else None


def _first_media_path_legacy(run_dir: str) -> Optional[str]:
    """Backward-compatible shim for older callers.

    Historically Gallery passed a pseudo `run_dir` of `${outputs_dir}/${run_id}`.
    With the current flat output strategy, media is stored as:
    `${outputs_dir}/{run_id}.output.<ext>`.
    """

    outputs_dir = os.path.dirname(run_dir)
    run_id = os.path.basename(run_dir.rstrip(os.sep))
    return _first_media_path(outputs_dir, run_id)


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
