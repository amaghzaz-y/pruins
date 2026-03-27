import os
import time
from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional, Union, cast

import requests

try:
    # Optional dependency: allows `P_API_KEY` to be loaded from a local .env file.
    from dotenv import load_dotenv
except Exception:  # pragma: no cover
    load_dotenv: Optional[Callable[..., bool]] = None


class PApiError(RuntimeError):
    def __init__(
        self,
        status_code: int,
        message: str,
        *,
        error_payload: Optional[dict] = None,
        request_id: Optional[str] = None,
    ):
        self.status_code = status_code
        self.error_payload = error_payload
        self.request_id = request_id
        super().__init__(message)


@dataclass(frozen=True)
class PredictionResponse:
    id: str
    model: str
    input: Dict[str, Any]
    get_url: str


@dataclass(frozen=True)
class PredictionStatusResponse:
    status: str
    generation_url: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None


@dataclass(frozen=True)
class FileUploadResponse:
    id: str
    name: str
    content_type: str
    size: int
    created_at: str
    expires_at: str
    urls: Dict[str, Any]


Json = Dict[str, Any]


class PApiClient:
    def __init__(
        self,
        api_key: Optional[str] = None,
        *,
        base_url: str = "https://api.pruna.ai",
        timeout_s: float = 30.0,
    ):
        self.api_key: Optional[str] = api_key or os.environ.get("P_API_KEY")
        if not self.api_key:
            raise ValueError("Missing API key. Set P_API_KEY or pass api_key=...")
        self.api_key = cast(str, self.api_key)
        self.base_url = base_url.rstrip("/")
        self.timeout_s = timeout_s
        self._session = requests.Session()

    def _headers(self, extra: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        h: Dict[str, str] = {"apikey": cast(str, self.api_key)}
        if extra:
            for k, v in extra.items():
                h[k] = v
        return h

    def _raise_for_status(self, resp: requests.Response) -> None:
        status_code = resp.status_code
        assert status_code is not None
        if 200 <= status_code < 300:
            return

        request_id = None
        try:
            payload = resp.json()
        except Exception:
            payload = None

        if isinstance(payload, dict):
            request_id = payload.get("request_id")
            err = payload.get("error")
            if isinstance(err, dict):
                code = err.get("code")
                msg = err.get("message") or "Request failed"
                message = f"P-API error {status_code} ({code}): {msg}"
            else:
                message = f"P-API request failed with status {status_code}"
        else:
            message = f"P-API request failed with status {status_code}"

        raise PApiError(
            status_code,
            message,
            error_payload=payload if isinstance(payload, dict) else None,
            request_id=request_id,
        )

    def create_prediction(
        self,
        *,
        model: str,
        input_payload: Json,
        try_sync: bool = False,
    ) -> Union[PredictionResponse, Dict[str, Any]]:
        """Create a prediction.

        Returns:
          - PredictionResponse for the async workflow
          - dict(status='succeeded', generation_url=...) for the try-sync workflow
        """

        headers: Dict[str, str] = {"Model": model}
        if try_sync:
            headers["Try-Sync"] = "true"

        url = f"{self.base_url}/v1/predictions"
        resp = self._session.post(
            url,
            headers=self._headers(headers),
            json={"input": input_payload},
            timeout=self.timeout_s,
        )
        self._raise_for_status(resp)
        payload: Any = resp.json()

        if "id" in payload and "model" in payload and "get_url" in payload:
            return PredictionResponse(
                id=payload["id"],
                model=payload["model"],
                input=payload.get("input", {}),
                get_url=payload["get_url"],
            )

        # try-sync success shape
        return payload

    def get_prediction_status(self, prediction_id: str) -> PredictionStatusResponse:
        url = f"{self.base_url}/v1/predictions/status/{prediction_id}"
        resp = self._session.get(url, headers=self._headers(), timeout=self.timeout_s)
        self._raise_for_status(resp)
        payload = resp.json()
        return PredictionStatusResponse(
            status=payload["status"],
            generation_url=payload.get("generation_url"),
            message=payload.get("message"),
            error=payload.get("error"),
        )

    def download_generation(
        self,
        *,
        generation_url: str,
        dest_path: Optional[str] = None,
    ) -> Union[bytes, str]:
        """Download generated content via the provided generation_url."""

        headers = self._headers()
        resp = self._session.get(
            generation_url, headers=headers, timeout=self.timeout_s, stream=True
        )
        self._raise_for_status(resp)

        content_type = resp.headers.get("Content-Type")
        content_disp = resp.headers.get("Content-Disposition")

        # Determine extension:
        # 1) Content-Type (preferred)
        # 2) Content-Disposition filename=... (fallback)
        def _extension_from_content_type(ct: Optional[str]) -> Optional[str]:
            if not ct:
                return None
            ct = ct.split(";", 1)[0].strip().lower()
            # Common media types for this client.
            mapping = {
                "image/png": "png",
                "image/jpeg": "jpg",
                "image/jpg": "jpg",
                "image/webp": "webp",
                "video/mp4": "mp4",
            }
            return mapping.get(ct)

        def _extension_from_content_disposition(cd: Optional[str]) -> Optional[str]:
            if not cd or "filename=" not in cd:
                return None
            filename = cd.split("filename=", 1)[1].strip().strip('"')
            filename = filename.split(";", 1)[0].strip()
            _, ext = os.path.splitext(filename)
            if not ext:
                return None
            ext = ext.lstrip(".")
            return ext.lower() or None

        ext = _extension_from_content_type(
            content_type
        ) or _extension_from_content_disposition(content_disp)

        # Keep suggested_name for backward-compatibility for callers
        # passing a directory dest_path, but deterministic naming will
        # override it to `output.<ext>`.
        suggested_name = None
        if content_disp and "filename=" in content_disp:
            suggested_name = content_disp.split("filename=", 1)[1].strip().strip('"')

        if dest_path is None:
            return resp.content

        if os.path.isdir(dest_path):
            # Deterministic naming when downloading into a directory.
            # This client saves generated content as output.png or output.mp4.
            if not ext:
                # Fall back to best-effort suggested_name, else `output`.
                if suggested_name:
                    _, ext2 = os.path.splitext(suggested_name)
                    ext = ext2.lstrip(".") if ext2 else None
            if not ext:
                ext = "bin"
            dest = os.path.join(dest_path, f"output.{ext}")
        else:
            dest = dest_path

        os.makedirs(os.path.dirname(dest) or ".", exist_ok=True)
        with open(dest, "wb") as f:
            for chunk in resp.iter_content(chunk_size=1024 * 64):
                if chunk:
                    f.write(chunk)
        return dest

    def upload_file(
        self,
        *,
        file_path: str,
        content_type: Optional[str] = None,
    ) -> FileUploadResponse:
        url = f"{self.base_url}/v1/files"
        filename = os.path.basename(file_path)

        with open(file_path, "rb") as f:
            files = {
                "content": (filename, f, content_type)
                if content_type
                else (filename, f)
            }
            resp = self._session.post(
                url,
                headers=self._headers(),
                files=files,
                timeout=self.timeout_s,
            )

        self._raise_for_status(resp)
        payload = resp.json()
        return FileUploadResponse(
            id=payload["id"],
            name=payload["name"],
            content_type=payload["content_type"],
            size=payload["size"],
            created_at=payload["created_at"],
            expires_at=payload["expires_at"],
            urls=payload["urls"],
        )

    def run_prediction_async(
        self,
        *,
        model: str,
        input_payload: Json,
        poll_interval_s: float = 2.0,
        timeout_s: float = 1200.0,
        download_to: Optional[str] = "./outputs",
    ) -> str:
        """Convenience helper: create prediction (async), poll, then download."""

        created = self.create_prediction(
            model=model, input_payload=input_payload, try_sync=False
        )
        if not isinstance(created, PredictionResponse):
            raise RuntimeError(
                "Expected async PredictionResponse but got try-sync response"
            )

        pred_id = created.id
        deadline = time.time() + timeout_s
        while True:
            status = self.get_prediction_status(pred_id)
            if status.status == "succeeded":
                if not status.generation_url:
                    raise RuntimeError("succeeded but generation_url missing")

                # Download generated result into a deterministic per-run subfolder.
                # UI expects output files to live under outputs/{prediction_id}/.
                dest_dir = os.path.join(download_to or "./outputs", pred_id)
                downloaded = self.download_generation(
                    generation_url=status.generation_url, dest_path=dest_dir
                )
                return (
                    downloaded if isinstance(downloaded, str) else "<downloaded bytes>"
                )
            if status.status in {"failed", "canceled"}:
                raise RuntimeError(
                    f"Prediction ended with status={status.status}: {status.message or status.error}"
                )
            if time.time() >= deadline:
                raise TimeoutError(f"Prediction polling timed out after {timeout_s}s")
            time.sleep(poll_interval_s)


def _example() -> None:
    if load_dotenv is not None:
        # By default, looks for a `.env` file in the current working directory.
        load_dotenv()

    api_key = os.environ.get("P_API_KEY")
    if not api_key:
        raise SystemExit("Set environment variable P_API_KEY to run the example")

    client = PApiClient(api_key=api_key)

    # Example: text-to-image with `p-image`
    model = "p-image"
    input_payload = {
        "prompt": "A majestic lion standing on a rocky cliff at sunset",
        "aspect_ratio": "16:9",
        "seed": 42,
        "disable_safety_checker": False,
    }

    out_dir = os.path.join(os.getcwd(), "outputs")
    path = client.run_prediction_async(
        model=model,
        input_payload=input_payload,
        download_to=out_dir,
    )
    print(path)


if __name__ == "__main__":
    _example()
