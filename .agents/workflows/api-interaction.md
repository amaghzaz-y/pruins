---
description: Logic for API interactions with Pruna AI.
---

Follow these steps for a complete API prediction cycle:

1.  **Initialize**: `new PApiClient(apiKey)`
2.  **Create**: `client.createPrediction(model, payload)`
3.  **Poll**: Poll `client.getPredictionStatus(id)` until status is 'succeeded' or 'failed'.
4.  **Download**: On success, `client.downloadGeneration(url)` returns a `Blob`.
5.  **Persist**: Save the result to `db.predictions` using the `PredictionRecord` model.
