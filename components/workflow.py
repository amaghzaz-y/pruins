import os
import time
from dataclasses import asdict
from typing import Any, Dict, Tuple

from client import PApiClient, PredictionResponse

from components.storage import (
    _build_run_dir,
    _now_iso,
    _output_file_path,
    _write_metadata,
)


def _run_prediction_and_download(
    *,
    client: PApiClient,
    task_type: str,
    model: str,
    input_payload: Dict[str, Any],
    outputs_dir: str,
    poll_interval_s: float,
    timeout_s: float,
) -> Tuple[str, Dict[str, Any]]:
    created_at = _now_iso()
    run_dir = _build_run_dir(outputs_dir=outputs_dir, task_type=task_type)

    prediction = client.create_prediction(
        model=model, input_payload=input_payload, try_sync=False
    )
    if not isinstance(prediction, PredictionResponse):
        raise RuntimeError(f"Expected async PredictionResponse but got: {prediction!r}")

    pred_id = prediction.id
    status_payload: Dict[str, Any] | None = None
    last_generation_url: str | None = None

    deadline = time.time() + timeout_s
    while True:
        status = client.get_prediction_status(prediction_id=pred_id)
        st_text = status.status
        if status.message:
            st_text = f"{st_text}: {status.message}"
        if status.error:
            st_text = f"{st_text}: {status.error}"
        _ = st_text
        status_payload = asdict(status)
        last_generation_url = status.generation_url

        if status.status == "succeeded":
            if not status.generation_url:
                raise RuntimeError("succeeded but generation_url missing")
            # Save generation flat under outputs_dir.
            # The client decides extension and uses output.<ext> when dest_path is
            # a directory. Since we want a flat single-file output strategy, we
            # download into `${run_dir}`'s directory path and then normalize below.
            # `download_generation` supports downloading into a directory by naming
            # `output.<ext>`. We'll emulate that by downloading into the run_dir
            # and then moving/renaming to `${outputs_dir}/{run_id}.output.<ext>`.
            downloaded_path = client.download_generation(
                generation_url=status.generation_url, dest_path=run_dir
            )

            # Normalize to flat path.
            # `download_generation` saves into `{run_dir}/output.<ext>`.
            # Use basename() to avoid path segment contamination (e.g. extracting
            # "outputs" instead of "png/mp4").
            if isinstance(downloaded_path, str):
                basename = os.path.basename(downloaded_path)
                # expected basename: output.<ext>
                ext = (
                    basename.rsplit("output.", 1)[-1] if "output." in basename else None
                )

                if ext:
                    flat_path = _output_file_path(
                        outputs_dir=outputs_dir,
                        run_id=os.path.basename(run_dir),
                        content_ext=ext,
                    )
                    os.makedirs(os.path.dirname(flat_path) or ".", exist_ok=True)
                    os.replace(downloaded_path, flat_path)

            # Remove intermediate downloader directory so we keep only flat outputs.
            # (Best-effort: if download failed to create anything, this is harmless.)
            try:
                if os.path.isdir(run_dir):
                    for root, dirs, files in os.walk(run_dir, topdown=False):
                        for fn in files:
                            os.remove(os.path.join(root, fn))
                        for d in dirs:
                            os.rmdir(os.path.join(root, d))
                    os.rmdir(run_dir)
            except OSError:
                # Do not fail the prediction on cleanup issues.
                pass
            completed_at = _now_iso()
            meta = {
                "task_type": task_type,
                "model": model,
                "input_payload": input_payload,
                "created_at": created_at,
                "completed_at": completed_at,
                "prediction_id": pred_id,
                "last_status": status_payload,
                "generation_url": status.generation_url,
            }
            _write_metadata(run_dir, meta)
            return run_dir, meta

        if status.status in {"failed", "canceled"}:
            completed_at = _now_iso()
            meta = {
                "task_type": task_type,
                "model": model,
                "input_payload": input_payload,
                "created_at": created_at,
                "completed_at": completed_at,
                "prediction_id": pred_id,
                "last_status": status_payload,
                "generation_url": last_generation_url,
            }
            _write_metadata(run_dir, meta)
            raise RuntimeError(
                f"Prediction ended with status={status.status}: {status.message or status.error}"
            )

        if time.time() >= deadline:
            raise TimeoutError(f"Prediction polling timed out after {timeout_s}s")
        time.sleep(poll_interval_s)
