export interface PredictionRequest {
  input: Record<string, any>;
}

export interface PredictionResponse {
  id: string;
  model: string;
  input: Record<string, any>;
  get_url: string;
}

export interface PredictionStatusResponse {
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  generation_url?: string;
  message?: string;
  error?: string;
}

export interface FileUploadResponse {
  id: string;
  name: string;
  content_type: string;
  size: number;
  created_at: string;
  expires_at: string;
  urls: Record<string, any>;
}

export class PApiError extends Error {
  public statusCode: number;
  public errorPayload?: any;
  public requestId?: string;

  constructor(
    statusCode: number,
    message: string,
    errorPayload?: any,
    requestId?: string,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorPayload = errorPayload;
    this.requestId = requestId;
    this.name = "PApiError";
  }
}

export class PApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, options: { baseUrl?: string } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = (
      options.baseUrl ||
      import.meta.env.VITE_API_URL ||
      "/proxy"
    ).replace(/\/$/, "");
  }

  private get headers() {
    return {
      apikey: this.apiKey,
      "Content-Type": "application/json",
    };
  }

  private async raiseForStatus(response: Response) {
    if (response.ok) return;

    let payload: any;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    let message = `P-API request failed with status ${response.status}`;
    let requestId: string | undefined;

    if (payload && typeof payload === "object") {
      requestId = payload.request_id;
      if (payload.error && typeof payload.error === "object") {
        const code = payload.error.code;
        const msg = payload.error.message || "Request failed";
        message = `P-API error ${response.status} (${code}): ${msg}`;
      }
    }

    throw new PApiError(response.status, message, payload, requestId);
  }

  async createPrediction(
    model: string,
    inputPayload: Record<string, any>,
    trySync = false,
  ): Promise<
    PredictionResponse | { status: "succeeded"; generation_url: string }
  > {
    const headers: Record<string, string> = {
      ...this.headers,
      Model: model,
    };
    if (trySync) {
      headers["Try-Sync"] = "true";
    }

    const response = await fetch(`${this.baseUrl}/v1/predictions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ input: inputPayload }),
    });

    await this.raiseForStatus(response);
    return await response.json();
  }

  async getPredictionStatus(
    predictionId: string,
  ): Promise<PredictionStatusResponse> {
    const response = await fetch(
      `${this.baseUrl}/v1/predictions/status/${predictionId}`,
      {
        method: "GET",
        headers: this.headers,
      },
    );

    await this.raiseForStatus(response);
    return await response.json();
  }

  async uploadFile(file: File): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append("content", file);

    const headers: Record<string, string> = {
      apikey: this.apiKey,
      // Note: Don't set Content-Type header for FormData, let the browser do it
    };

    const response = await fetch(`${this.baseUrl}/v1/files`, {
      method: "POST",
      headers,
      body: formData,
    });

    await this.raiseForStatus(response);
    return await response.json();
  }

  async downloadGeneration(generationUrl: string): Promise<Blob> {
    // If the URL is an absolute link to the Pruna API, rewrite it to use our proxy
    let finalUrl = generationUrl;
    if (this.baseUrl === "/proxy" && generationUrl.includes("api.pruna.ai")) {
      finalUrl = generationUrl.replace(/^https:\/\/api\.pruna\.ai/, "/proxy");
    }

    const response = await fetch(finalUrl, {
      method: "GET",
      headers: this.headers,
    });

    await this.raiseForStatus(response);
    return await response.blob();
  }
}
