export interface ModelConfig {
  id: string;
  name: string;
  type: 'image-gen' | 'image-edit' | 'video-gen';
  description: string;
  pricing: string;
  rateLimit: string;
  documentation: string;
  requiresImage: boolean;
  multipleImages: boolean;
  defaultAspectRatios: string[];
  parameters: Parameter[];
}

export interface Parameter {
  key: string;
  label: string;
  type: 'select' | 'number' | 'text' | 'boolean';
  options?: string[];
  default?: any;
  min?: number;
  max?: number;
  step?: number;
}

export const models: ModelConfig[] = [
  // Pruna Models
  {
    id: 'p-image',
    name: 'p-image',
    type: 'image-gen',
    description: 'Premium high-quality image generation',
    pricing: '$0.005 / image output',
    rateLimit: '500/min',
    documentation: 'View Docs',
    requiresImage: false,
    multipleImages: false,
    defaultAspectRatios: ['3:4', '4:3', '9:16', '16:9', '1:1', '21:9'],
    parameters: [
      { key: 'aspect_ratio', label: 'Aspect Ratio', type: 'select', default: '16:9' },
      { key: 'seed', label: 'Seed', type: 'number', default: undefined },
      { key: 'disable_safety_checker', label: 'Disable Safety Checker', type: 'boolean', default: true },
    ],
  },
  {
    id: 'p-image-lora',
    name: 'p-image-lora',
    type: 'image-gen',
    description: 'p-image with custom LoRA support',
    pricing: '$0.005 / image output',
    rateLimit: '500/min',
    documentation: 'View Docs',
    requiresImage: false,
    multipleImages: false,
    defaultAspectRatios: ['3:4', '4:3', '9:16', '16:9', '1:1', '21:9'],
    parameters: [
      { key: 'lora_weights', label: 'LoRA Weights (huggingface.co/username/repo)', type: 'text' },
      { key: 'lora_scale', label: 'LoRA Scale', type: 'number', default: 1, min: 0, max: 2, step: 0.1 },
      { key: 'aspect_ratio', label: 'Aspect Ratio', type: 'select', default: '16:9' },
      { key: 'seed', label: 'Seed', type: 'number', default: undefined },
      { key: 'disable_safety_checker', label: 'Disable Safety Checker', type: 'boolean', default: true },
    ],
  },
  {
    id: 'p-image-trainer',
    name: 'p-image-trainer',
    type: 'image-gen',
    description: 'Train LoRAs for p-image-lora (async only)',
    pricing: '$1.80 / 1000 steps',
    rateLimit: '5/min',
    documentation: 'View Docs',
    requiresImage: true,
    multipleImages: true,
    defaultAspectRatios: ['1:1'],
    parameters: [
      { key: 'image_data', label: 'Training Data (ZIP URL)', type: 'text' },
      { key: 'steps', label: 'Training Steps', type: 'number', default: 1000, min: 100, max: 10000, step: 100 },
      { key: 'training_type', label: 'Training Type', type: 'select', options: ['balanced', 'subject', 'style'], default: 'balanced' },
    ],
  },
  {
    id: 'p-image-edit',
    name: 'p-image-edit',
    type: 'image-edit',
    description: 'Premium image editing with fine control',
    pricing: '$0.010 / image output',
    rateLimit: '500/min',
    documentation: 'View Docs',
    requiresImage: true,
    multipleImages: true,
    defaultAspectRatios: ['1:1', '16:9', '3:4', '4:3'],
    parameters: [
      { key: 'images', label: 'Source Images', type: 'select', options: ['upload'], default: 'upload' },
      { key: 'aspect_ratio', label: 'Aspect Ratio', type: 'select', default: '1:1' },
      { key: 'seed', label: 'Seed', type: 'number', default: undefined },
      { key: 'disable_safety_checker', label: 'Disable Safety Checker', type: 'boolean', default: true },
    ],
  },
  {
    id: 'p-image-edit-lora',
    name: 'p-image-edit-lora',
    type: 'image-edit',
    description: 'p-image-edit with custom LoRA support',
    pricing: '$0.010 / image output',
    rateLimit: '500/min',
    documentation: 'View Docs',
    requiresImage: true,
    multipleImages: true,
    defaultAspectRatios: ['1:1', '16:9', '3:4', '4:3'],
    parameters: [
      { key: 'images', label: 'Source Images', type: 'select', options: ['upload'], default: 'upload' },
      { key: 'lora_weights', label: 'LoRA Weights (huggingface.co/username/repo)', type: 'text' },
      { key: 'lora_scale', label: 'LoRA Scale', type: 'number', default: 1, min: 0, max: 2, step: 0.1 },
      { key: 'aspect_ratio', label: 'Aspect Ratio', type: 'select', default: '1:1' },
      { key: 'seed', label: 'Seed', type: 'number', default: undefined },
      { key: 'disable_safety_checker', label: 'Disable Safety Checker', type: 'boolean', default: true },
    ],
  },
  {
    id: 'p-image-edit-trainer',
    name: 'p-image-edit-trainer',
    type: 'image-edit',
    description: 'Train LoRAs for p-image-edit-lora (async only)',
    pricing: '$4.00 / 1000 steps',
    rateLimit: '5/min',
    documentation: 'View Docs',
    requiresImage: true,
    multipleImages: true,
    defaultAspectRatios: ['1:1'],
    parameters: [
      { key: 'image_data', label: 'Training Data (ZIP URL)', type: 'text' },
      { key: 'steps', label: 'Training Steps', type: 'number', default: 1000, min: 100, max: 10000, step: 100 },
      { key: 'training_type', label: 'Training Type', type: 'select', options: ['balanced', 'subject', 'style'], default: 'balanced' },
    ],
  },
  {
    id: 'p-video',
    name: 'p-video',
    type: 'video-gen',
    description: 'Premium high-quality video generation',
    pricing: 'Priced by multiple properties',
    rateLimit: '250/min',
    documentation: 'View Docs',
    requiresImage: false,
    multipleImages: false,
    defaultAspectRatios: ['16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '1:1'],
    parameters: [
      { key: 'image', label: 'Source Image', type: 'select', options: ['upload'] },
      { key: 'aspect_ratio', label: 'Aspect Ratio', type: 'select', default: '16:9' },
      { key: 'resolution', label: 'Resolution', type: 'select', options: ['720p', '1080p'], default: '720p' },
      { key: 'fps', label: 'Frames Per Second', type: 'number', default: 24, min: 24, max: 48, step: 24 },
      { key: 'duration', label: 'Duration (seconds)', type: 'number', default: 5, min: 1, max: 10, step: 1 },
      { key: 'seed', label: 'Seed', type: 'number', default: undefined },
      { key: 'draft', label: 'Draft Mode', type: 'boolean', default: false },
      { key: 'save_audio', label: 'Save Audio', type: 'boolean', default: true },
      { key: 'prompt_upsampling', label: 'Prompt Upsampling', type: 'boolean', default: true },
      { key: 'disable_safety_filter', label: 'Disable Safety Filter', type: 'boolean', default: true },
    ],
  },
];

export const getModelById = (id: string): ModelConfig | undefined => {
  return models.find(m => m.id === id);
};

export const getModelsByType = (type: 'image-gen' | 'image-edit' | 'video-gen'): ModelConfig[] => {
  return models.filter(m => m.type === type);
};

// Keep only Pruna models (those starting with 'p-')
export const modelGroups = [
  {
    label: 'Pruna Models',
    models: models.filter(m => m.id.startsWith('p-')),
  },
];
