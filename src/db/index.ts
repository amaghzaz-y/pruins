import Dexie, { type Table } from 'dexie';

export interface PredictionRecord {
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

export interface SettingsRecord {
  key: string;
  value: any;
}

export class PrunaDatabase extends Dexie {
  predictions!: Table<PredictionRecord>;
  settings!: Table<SettingsRecord>;

  constructor() {
    super('PrunaDB');
    this.version(1).stores({
      predictions: 'id, model, status, createdAt',
      settings: 'key',
    });
  }
}

export const db = new PrunaDatabase();

export const getApiKey = async (): Promise<string | null> => {
  const record = await db.settings.get('apiKey');
  return record ? record.value : null;
};

export const setApiKey = async (key: string): Promise<void> => {
  await db.settings.put({ key: 'apiKey', value: key });
};
