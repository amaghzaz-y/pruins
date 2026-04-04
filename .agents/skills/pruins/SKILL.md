---
name: pruins
description: Core architectural and development rules for the Pruins React SPA.
---

# pruins — Agentic Guidelines

This skill provides comprehensive context for AI agents working on the **pruins** codebase, a React single-page application (SPA) serving as a client for the Pruna AI API.

## Project Overview

**pruins** implements a "local-first" architecture using IndexedDB (via Dexie) to store prediction history and assets (images/videos) locally.

### Metadata
- **Framework**: React 19 + Vite 8
- **UI Library**: Mantine v9
- **Database**: Dexie (IndexedDB)
- **Styling**: Mantine + PostCSS

## Core Architecture

### Local-First Persistence
- Predictions and assets (as Blobs) are stored in **IndexedDB** using `dexie`.
- Schema is defined in `src/db/index.ts`.
- Use the `db` instance from `src/db` for all persistence.
- Prefer `useLiveQuery` from `dexie-react-hooks` for reactive UI updates from the DB.

### API Client (`src/api/client.ts`)
- Use `PApiClient` for all interactions with `api.pruna.ai`.
- API keys are stored in the `settings` table of the database.
- The client handles `createPrediction`, `getPredictionStatus`, `uploadFile`, and `downloadGeneration`.

### UI Components (`src/components/`)
- **Mantine v9** is the primary UI framework.
- **Header**: Contains API key configuration and branding.
- **Sidebar**: Model selection and parameter inputs.
- **PredictionForm**: Initiating predictions.
- **Gallery**: History from IndexedDB.

## Data Models

### `PredictionRecord` (IndexedDB)
```typescript
interface PredictionRecord {
  id: string; // prediction_id
  model: string;
  input: Record<string, any>;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  createdAt: number;
  completedAt?: number;
  generationUrl?: string;
  assetBlob?: Blob;
  assetType?: string; // 'image' | 'video'
  error?: string;
}
```

## Development Guidelines for AI Agents

- **Mantine v9 Props**: Check [Mantine 9 documentation](https://mantine.dev) for latest prop names.
- **Type Safety**: Ensure all component props and state are properly typed.
- **Performance**: Use `Blob` URLs (`URL.createObjectURL(blob)`) for images from IndexedDB; revoke when necessary.
- **Error Handling**: Use `@mantine/notifications` to display errors.
