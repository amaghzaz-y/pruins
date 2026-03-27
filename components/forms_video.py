import os
import time
from typing import Any, Dict

from client import PApiClient, PApiError

from components.media import _first_media_path, _maybe_preview
from components.reuse import _reuse_fields_from_meta
from components.storage import _ensure_dir
from components.workflow import _run_prediction_and_download


def render_video_generation_form(
    st_ref: Any,
    client: PApiClient,
    outputs_dir: str,
    poll_interval_s: float,
    timeout_s: float,
) -> None:
    st = st_ref
    st.header("Video Generation")
    task_type = "video"
    model = st.text_input("Model", value="p-video")

    defaults = st.session_state.get("_reuse_meta")
    reuse = (
        _reuse_fields_from_meta(task_type, defaults)
        if isinstance(defaults, dict)
        else {}
    )

    with st.form("video_form"):
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

        resolution = st.selectbox(
            "Resolution",
            options=["720p", "1080p"],
            index=0,
            help="Resolution of the video.",
        )

        fps = st.selectbox(
            "FPS",
            options=[24, 48],
            index=0,
            help="Frames per second of the video.",
        )

        duration = st.slider(
            "Duration (seconds)",
            min_value=1,
            max_value=10,
            value=5,
            help="Duration of the video in seconds. Ignored when audio is provided.",
        )

        seed = st.number_input(
            "Seed",
            value=int(reuse["seed"])
            if isinstance(reuse.get("seed"), (int, float))
            else 0,
        )

        draft = st.checkbox(
            "Draft mode",
            value=bool(reuse.get("draft", False)),
            help="Faster, lower-quality preview generation.",
        )

        st.markdown("---")
        init_upload = st.file_uploader(
            "Input image / first frame (optional)", type=["png", "jpg", "jpeg", "webp"]
        )

        submitted = st.form_submit_button("Generate")

    if not submitted:
        return

    uploads_dir = os.path.join(outputs_dir, "uploads")
    _ensure_dir(uploads_dir)

    def _safe_id_fragment(s: str) -> str:
        s = s.strip().lower()
        import re

        s = re.sub(r"[^a-z0-9]+", "_", s)
        s = s.strip("_")
        return s[:64] if s else "run"

    input_payload: Dict[str, Any] = {
        "prompt": prompt,
        "aspect_ratio": aspect_ratio,
        "resolution": resolution,
        "fps": int(fps),
        "duration": int(duration),
        "seed": int(seed) if seed != 0 else None,
        "draft": draft,
    }
    input_payload = {k: v for k, v in input_payload.items() if v is not None}

    if init_upload:
        init_path = os.path.join(
            uploads_dir,
            f"init_{int(time.time())}_{_safe_id_fragment(init_upload.name)}",
        )
        with open(init_path, "wb") as f:
            f.write(init_upload.getbuffer())
        init_ct = init_upload.type or "application/octet-stream"
        init_file = client.upload_file(file_path=init_path, content_type=init_ct)
        # API expects `input.image` as a fetchable URI (`format: uri`),
        # not an opaque upload id.
        input_payload["image"] = str(init_file.urls["get"])

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
        run_id = os.path.basename(run_dir.rstrip(os.sep))
        preview_path = _first_media_path(outputs_dir, run_id)
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
