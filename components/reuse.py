from typing import Any, Dict


def _reuse_fields_from_meta(task_type: str, meta: Dict[str, Any]) -> Dict[str, Any]:
    input_payload = meta.get("input_payload") or {}
    reuse: Dict[str, Any] = {}
    # Common fields
    reuse["prompt"] = input_payload.get("prompt", "")
    reuse["aspect_ratio"] = input_payload.get("aspect_ratio", "")
    reuse["seed"] = input_payload.get("seed")
    reuse["disable_safety_checker"] = input_payload.get("disable_safety_checker")

    # File reference fields (whatever the API expects)
    # We intentionally leave raw keys for future proofing.
    for k in [
        "image",
        "mask",
        "input_image",
        "source_image",
        "init_image",
        "urls",
        "files",
    ]:
        if k in input_payload:
            reuse[k] = input_payload[k]

    return reuse
