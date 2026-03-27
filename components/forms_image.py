import os
import time
from typing import Any, Dict, List

from client import PApiClient, PApiError

from components.media import _first_media_path, _maybe_preview
from components.reuse import _reuse_fields_from_meta
from components.storage import _ensure_dir
from components.workflow import _run_prediction_and_download


def render_image_edit_form(
    st_ref: Any,
    client: PApiClient,
    outputs_dir: str,
    poll_interval_s: float,
    timeout_s: float,
) -> None:
    st = st_ref
    st.header("Image Editing")
    task_type = "image-edit"
    model = st.text_input("Model", value="p-image-edit")

    defaults = st.session_state.get("_reuse_meta")
    reuse = (
        _reuse_fields_from_meta(task_type, defaults)
        if isinstance(defaults, dict)
        else {}
    )

    with st.form("image_edit_form"):
        prompt = st.text_area("Prompt", value=reuse.get("prompt", ""), height=120)
        aspect_ratio = st.selectbox(
            "Aspect ratio",
            options=["1:1", "16:9", "9:16", "4:3", "3:4", "21:9", "9:21"],
            index=max(
                0,
                ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9", "9:21"].index(
                    reuse.get("aspect_ratio", "3:4")
                ),
            )
            if reuse.get("aspect_ratio", None)
            else 1,
        )
        seed = st.number_input(
            "Seed",
            value=int(reuse["seed"])
            if isinstance(reuse.get("seed"), (int, float))
            else 0,
        )
        # Always disable safety checker (requested behavior).
        disable_safety_checker = True

        st.markdown("---")
        src_uploads = st.file_uploader(
            "Source image(s)",
            type=["png", "jpg", "jpeg", "webp"],
            accept_multiple_files=True,
        )

        submitted = st.form_submit_button("Generate")

    if not submitted:
        return

    if not src_uploads:
        st.error("At least one source image is required")
        st.stop()

    # P-API model schema for image editing uses `input.images` (array 1-5)
    # and does NOT use `input.image`/`input.mask`.

    uploads_dir = os.path.join(outputs_dir, "uploads")
    _ensure_dir(uploads_dir)

    def _safe_id_fragment(s: str) -> str:
        s = s.strip().lower()
        import re

        s = re.sub(r"[^a-z0-9]+", "_", s)
        s = s.strip("_")
        return s[:64] if s else "run"

    input_images: List[str] = []
    for src_upload in src_uploads:
        src_path = os.path.join(
            uploads_dir,
            f"source_{int(time.time())}_{_safe_id_fragment(src_upload.name)}",
        )
        with open(src_path, "wb") as f:
            f.write(src_upload.getbuffer())

        src_ct = src_upload.type or "application/octet-stream"
        uploaded = client.upload_file(file_path=src_path, content_type=src_ct)
        input_images.append(str(uploaded.urls["get"]))

    if not input_images:
        st.error("At least one source image is required")
        st.stop()

    input_payload: Dict[str, Any] = {
        "prompt": prompt,
        "aspect_ratio": aspect_ratio,
        "disable_safety_checker": disable_safety_checker,
        "seed": int(seed) if seed != 0 else None,
    }
    input_payload = {k: v for k, v in input_payload.items() if v is not None}
    # p-image-edit expects `input.images` as an array (1-5) of `uri` strings.
    # `client.upload_file()` returns a retrievable URL at `urls["get"]`.
    input_payload["images"] = input_images

    st.info("Starting prediction...")
    try:
        with st.spinner("Generating (this may take a minute)..."):
            run_dir, meta = _run_prediction_and_download(
                client=client,
                task_type=task_type,
                model=model,
                input_payload=input_payload,
                outputs_dir=outputs_dir,
                poll_interval_s=float(poll_interval_s),
                timeout_s=float(timeout_s),
            )
        st.success("Generation complete")
        st.subheader("Preview")
        preview_path = _first_media_path(run_dir)
        if preview_path:
            _maybe_preview(preview_path)
        st.caption(f"Saved to: {run_dir}")
        st.session_state["_last_run_dir"] = run_dir
        st.session_state.pop("_reuse_meta", None)
    except PApiError as e:
        st.error(f"Pruna API error: status_code={e.status_code}")
        if e.request_id:
            st.write(f"request_id: {e.request_id}")
        if e.error_payload:
            st.json(e.error_payload)
    except Exception as e:
        st.error(str(e))
