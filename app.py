import os

import streamlit as st
from components.forms_image import render_image_edit_form
from components.forms_video import render_video_generation_form
from components.media import _first_media_path, _maybe_preview
from components.storage import DEFAULT_OUTPUTS_DIR, _ensure_dir, _scan_runs
from dotenv import load_dotenv

from client import PApiClient

load_dotenv()


st.set_page_config(layout="wide")

with st.sidebar:
    st.title("Pruna")
    api_key = os.environ.get("P_API_KEY")
    if api_key:
        st.success("API key loaded")
    else:
        st.error("Missing `P_API_KEY` env var")
        st.stop()

    outputs_dir = st.text_input(
        "Results directory",
        value=DEFAULT_OUTPUTS_DIR,
    )
    _ensure_dir(outputs_dir)

    task_page = st.radio(
        "Task",
        ["Image Editing", "Video Generation", "Gallery"],
        index=0,
    )

    poll_interval_s = st.number_input(
        "Poll interval (seconds)", min_value=0.5, max_value=10.0, value=2.0, step=0.5
    )
    timeout_s = st.number_input(
        "Timeout (seconds)", min_value=30, max_value=3600, value=1200, step=30
    )


client = PApiClient()


if task_page == "Gallery":
    st.header("Gallery / History")
    runs = _scan_runs(outputs_dir)
    if not runs:
        st.info("No previous runs found in the results directory.")
        st.stop()

    for meta in runs:
        run_dir = meta["_run_dir"]
        task_type = meta.get("task_type") or meta.get("_task_type")
        model = meta.get("model")
        input_payload = meta.get("input_payload") or {}
        prompt = input_payload.get("prompt") or "(missing prompt)"
        created_at = meta.get("created_at")
        completed_at = meta.get("completed_at")
        pred_id = meta.get("prediction_id")

        st.subheader(f"{task_type} • {model}")
        st.caption(
            f"Run: {meta.get('_run_id')} • {created_at or completed_at or ''} • pred: {pred_id or ''}"
        )

        preview_path = _first_media_path(run_dir)
        if preview_path:
            _maybe_preview(preview_path)
        else:
            st.warning("No media file found in run folder.")

        cols = st.columns([1, 1])
        with cols[0]:
            if st.button(
                "Reuse", key=f"reuse_{meta.get('_task_type')}_{meta.get('_run_id')}"
            ):
                st.session_state["_reuse_meta"] = meta
                # Preserve existing routing behavior.
                # This project uses `app.py` as the main Streamlit entrypoint.
                # Only the main file and files under `pages/` are valid switch targets.
                if task_type == "image-edit":
                    st.switch_page("app.py")
                elif task_type == "video":
                    st.switch_page("app.py")
                st.rerun()

        with cols[1]:
            download_path = preview_path
            if download_path and st.button(
                "Download file",
                key=f"dl_{meta.get('_task_type')}_{meta.get('_run_id')}",
            ):
                with open(download_path, "rb") as f:
                    st.download_button(
                        label="Confirm download",
                        data=f,
                        file_name=os.path.basename(download_path),
                        mime="application/octet-stream",
                    )

        with st.expander("Metadata", expanded=False):
            st.json(meta)

    st.stop()


if task_page == "Image Editing":
    render_image_edit_form(
        st,
        client,
        outputs_dir,
        poll_interval_s=float(poll_interval_s),
        timeout_s=float(timeout_s),
    )


if task_page == "Video Generation":
    render_video_generation_form(
        st,
        client,
        outputs_dir,
        poll_interval_s=float(poll_interval_s),
        timeout_s=float(timeout_s),
    )
