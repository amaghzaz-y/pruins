import json
import os
import random
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional


DEFAULT_OUTPUTS_DIR = os.path.join("outputs", "pruna")


def _uploads_dir(outputs_dir: str) -> str:
    return os.path.join(outputs_dir, "uploads")


def _now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat()


def _safe_id_fragment(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = s.strip("_")
    return s[:64] if s else "run"


def _make_run_id() -> str:
    # 20260327_120501_ab12cd34
    t = time.strftime("%Y%m%d_%H%M%S")
    # short-random suffix without new deps
    suf = "".join(random.choice("0123456789abcdef") for _ in range(8))
    return f"{t}_{suf}"


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def _build_run_dir(
    outputs_dir: str,
    task_type: str,
    run_id: Optional[str] = None,
) -> str:
    # Flat output strategy: create a deterministic run name, but do not
    # nest media files into task/run subfolders.
    run_id = run_id or _make_run_id()
    _ensure_dir(outputs_dir)
    return os.path.join(outputs_dir, run_id)


def _output_file_path(*, outputs_dir: str, run_id: str, content_ext: str) -> str:
    # All generated files are flat under outputs_dir.
    content_ext = content_ext.lstrip(".").lower() or "bin"
    return os.path.join(outputs_dir, f"{run_id}.output.{content_ext}")


def _metadata_path(outputs_dir: str, run_id: str) -> str:
    return os.path.join(outputs_dir, f"{run_id}.metadata.json")


def _write_metadata(run_dir: str, meta: Dict[str, Any]) -> None:
    # `run_dir` is actually `${outputs_dir}/${run_id}` per flat strategy.
    outputs_dir = os.path.dirname(run_dir)
    run_id = os.path.basename(run_dir)
    with open(_metadata_path(outputs_dir, run_id), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)


def _load_metadata(run_dir: str) -> Optional[Dict[str, Any]]:
    # `run_dir` is `${outputs_dir}/${run_id}` per flat strategy.
    outputs_dir = os.path.dirname(run_dir)
    run_id = os.path.basename(run_dir)
    p = _metadata_path(outputs_dir, run_id)
    if not os.path.exists(p):
        return None
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def _scan_runs(outputs_dir: str) -> list[Dict[str, Any]]:
    runs: list[Dict[str, Any]] = []
    if not os.path.isdir(outputs_dir):
        return runs

    # Flat strategy: outputs_dir contains:
    # - ${run_id}.metadata.json
    # - ${run_id}.output.<ext>
    # - uploads/...
    # Ignore non-run dirs.
    for name in sorted(os.listdir(outputs_dir)):
        if name == "uploads":
            continue
        if not name.endswith(".metadata.json"):
            continue
        run_id = name[: -len(".metadata.json")]
        run_dir = os.path.join(outputs_dir, run_id)
        meta = _load_metadata(run_dir)
        if not meta:
            continue
        meta = dict(meta)
        meta["_run_dir"] = run_dir
        meta["_task_type"] = meta.get("task_type")
        meta["_run_id"] = run_id
        runs.append(meta)

    # Newest first if timestamps exist
    def _key(m: Dict[str, Any]) -> str:
        return str(m.get("created_at") or m.get("completed_at") or "")

    runs.sort(key=_key, reverse=True)
    return runs
