import {
  Stack,
  Textarea,
  Select,
  NumberInput,
  Button,
  Group,
  Paper,
  Text,
  FileButton,
  Box,
  LoadingOverlay,
  Alert,
  AspectRatio,
  Image,
  ActionIcon,
  SimpleGrid,
} from '@mantine/core';
import { useState, useEffect } from 'react';
import { useForm } from '@mantine/form';
import { Upload, Image as ImageIcon, Video as VideoIcon, AlertCircle, Check, X } from 'lucide-react';
import { PApiClient } from '../api/client';
import { db, getSettings, type PredictionRecord } from '../db';
import { getModelById, type ModelConfig } from '../config/models';

interface PredictionFormProps {
  selectedModelId: string;
}

function ImagePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;

  return (
    <Box pos="relative" style={{ border: '2px solid var(--mantine-color-default-border)' }}>
      <AspectRatio ratio={1}>
        <Image src={url} radius="0" fit="cover" />
      </AspectRatio>
      <ActionIcon
        pos="absolute"
        top={0}
        right={0}
        color="red"
        size="sm"
        radius="0"
        variant="filled"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        style={{ zIndex: 10 }}
      >
        <X size={14} />
      </ActionIcon>
    </Box>
  );
}

function parseRatio(ratioStr: string): number {
  const [w, h] = ratioStr.split(':').map(Number);
  return w / h;
}

export function PredictionForm({ selectedModelId }: PredictionFormProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [latestGeneration, setLatestGeneration] = useState<PredictionRecord | null>(null);
  const [generationUrl, setGenerationUrl] = useState<string | null>(null);
  const [model, setModel] = useState<ModelConfig | null>(null);
  const [userSettings, setUserSettings] = useState<{ defaultAspectRatio: string; defaultSeed?: number }>({ defaultAspectRatio: '3:4' });

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getSettings();
      setUserSettings({
        defaultAspectRatio: settings.defaultAspectRatio,
        defaultSeed: settings.defaultSeed,
      });
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const m = getModelById(selectedModelId);
    setModel(m || null);
    if (m) {
      // Reset file state when model changes
      setFiles([]);
      setLatestGeneration(null);
      if (generationUrl) {
        URL.revokeObjectURL(generationUrl);
        setGenerationUrl(null);
      }
    }
  }, [selectedModelId]);

  useEffect(() => {
    if (generationUrl) {
      return () => URL.revokeObjectURL(generationUrl);
    }
  }, [generationUrl]);

  const form = useForm<Record<string, any>>({
    initialValues: {
      prompt: '',
    },
    validate: {
      prompt: (val) => (typeof val === 'string' && val.length < 3 ? 'Prompt is too short' : null),
    },
  });

  useEffect(() => {
    if (model) {
      const defaults: Record<string, any> = { prompt: form.values.prompt };
      model.parameters.forEach(param => {
        if (param.default !== undefined) {
          // Use user's default settings for specific parameters when available
          if (param.key === 'aspect_ratio' && userSettings.defaultAspectRatio) {
            defaults[param.key] = userSettings.defaultAspectRatio;
          } else if (param.key === 'seed' && userSettings.defaultSeed !== undefined) {
            defaults[param.key] = userSettings.defaultSeed;
          } else {
            if (param.type === 'boolean') {
              defaults[param.key] = param.default ? 'true' : 'false';
            } else {
              defaults[param.key] = param.default;
            }
          }
        }
      });
      form.setValues(defaults);
    }
  }, [model, userSettings]);

  const handleSubmit = async (values: typeof form.values) => {
    if (!model) return;
    const m = model; // non-null local reference

    const settings = await getSettings();
    const apiKey = settings.apiKey;
    if (!apiKey) {
      setError('Pruna API Key not found. Please set it in Settings.');
      return;
    }

    if (m.requiresImage && files.length === 0) {
      setError(`${m.name} requires at least one source image.`);
      return;
    }

    setLoading(true);
    setError(null);
    setStatus('Uploading assets...');

    const client = new PApiClient(apiKey);

    try {
      // 1. Upload files
      const uploadedUrls: string[] = [];
      if (files.length > 0) {
        for (const file of files) {
          const uploaded = await client.uploadFile(file);
          uploadedUrls.push(uploaded.urls.get);
        }
      }

      // Build input payload from form values (excluding file-based parameters)
      const inputPayload: Record<string, any> = {};
      m.parameters.forEach(param => {
        // Skip file-based parameters (they'll be added later)
        if (['images', 'image', 'src_ref_images', 'image_data'].includes(param.key)) {
          return;
        }
        const value = values[param.key];
        if (value !== undefined && value !== '') {
          if (param.type === 'boolean') {
            inputPayload[param.key] = value === 'true' || value === true;
          } else if (param.type === 'number') {
            inputPayload[param.key] = Number(value);
          } else {
            inputPayload[param.key] = value;
          }
        }
      });

      // Ensure prompt is included
      inputPayload.prompt = values.prompt;

      // Add uploaded files to payload based on model's expected parameter
      if (files.length > 0) {
        if (m.parameters.some(p => p.key === 'images')) {
          inputPayload.images = uploadedUrls;
        } else if (m.parameters.some(p => p.key === 'image')) {
          inputPayload.image = uploadedUrls[0];
        } else if (m.parameters.some(p => p.key === 'src_ref_images')) {
          inputPayload.src_ref_images = uploadedUrls;
        }
      }

      console.log('Sending prediction with model:', m.id, 'payload:', inputPayload);

      // 3. Create prediction
      setStatus('Initializing prediction...');
      const prediction = await client.createPrediction(m.id, inputPayload);
      const predId = (prediction as any).id;

      // 4. Save initial record
      await db.predictions.put({
        id: predId,
        model: m.id,
        input: inputPayload,
        status: 'starting',
        createdAt: Date.now(),
      });

      // 5. Poll
      setStatus('Processing on Pruna Cloud...');
      await pollPrediction(client, predId);

      // 6. Fetch the completed prediction to display
      const completedPrediction = await db.predictions.get(predId);
      if (completedPrediction && completedPrediction.assetBlob) {
        setLatestGeneration(completedPrediction);
        const url = URL.createObjectURL(completedPrediction.assetBlob);
        setGenerationUrl(url);
      }

      setStatus('Completed!');
    } catch (err: any) {
      console.error('Prediction error:', err);
      console.error('Error details:', err.errorPayload);
      setError(err.message || 'Workflow failed');
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  const pollPrediction = async (client: PApiClient, id: string) => {
    return new Promise<void>((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const resp = await client.getPredictionStatus(id);
          if (resp.status === 'succeeded') {
            clearInterval(interval);
            const blob = await client.downloadGeneration(resp.generation_url!);
            await db.predictions.update(id, {
              status: 'succeeded',
              completedAt: Date.now(),
              generationUrl: resp.generation_url,
              assetBlob: blob,
              assetType: resp.generation_url!.endsWith('.mp4') ? 'video' : 'image',
            });
            resolve();
          } else if (resp.status === 'failed' || resp.status === 'canceled') {
            clearInterval(interval);
            reject(new Error(resp.status));
          } else {
            setStatus(`Status: ${resp.status}...`);
          }
        } catch (err) {
          clearInterval(interval);
          reject(err);
        }
      }, 4000);
    });
  };

  const handleFileSelect = (payload: File | File[] | null) => {
    if (!payload) return;
    const selectedFiles = Array.isArray(payload) ? payload : [payload];
    if (model?.multipleImages) {
      setFiles(cur => [...cur, ...selectedFiles]);
    } else {
      setFiles([selectedFiles[0]]);
    }
    // Clear previous generation when new files are selected
    if (latestGeneration) {
      setLatestGeneration(null);
      if (generationUrl) {
        URL.revokeObjectURL(generationUrl);
        setGenerationUrl(null);
      }
    }
  };

  if (!model) {
    return (
      <Paper withBorder p="xl" bg="var(--mantine-color-body)" style={{ border: '2px solid var(--mantine-color-default-border)', borderRadius: '4px' }}>
        <Text c="red">Model not found: {selectedModelId}</Text>
      </Paper>
    );
  }

  return (
    <Paper withBorder p="xl" pos="relative" bg="var(--mantine-color-body)" style={{ border: '2px solid var(--mantine-color-default-border)', borderRadius: '4px' }}>
      <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: 'sm', blur: 2 }} />

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="lg">
          <Box style={{ borderBottom: '2px solid var(--mantine-color-default-border)', paddingBottom: 'md' }}>
            <Text size="xl" fw={700} style={{ letterSpacing: '0.02em' }}>
              {model.name.toUpperCase()}
            </Text>
            <Text size="xs" c="dimmed" style={{ letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '4px' }}>
              {model.description}
            </Text>
            <Group mt="xs" gap="xs">
              <Text size="xs" c="indigo" fw={700} style={{ letterSpacing: '0.02em' }}>
                {model.pricing}
              </Text>
              <Text size="xs" c="dimmed">|</Text>
              <Text size="xs" c="dimmed">{model.rateLimit}</Text>
            </Group>
          </Box>

          <Textarea
            label="PROMPT"
            placeholder="Describe what you want to generate..."
            required
            minRows={4}
            {...form.getInputProps('prompt')}
            styles={{ input: { borderRadius: '2px', border: '2px solid var(--mantine-color-default-border)' } }}
          />

          {/* Render dynamic parameters */}
          {model.parameters
            .filter(p => p.key !== 'prompt' && p.key !== 'images' && p.key !== 'image' && p.key !== 'src_ref_images')
            .map((param) => (
            <Box key={param.key}>
              {param.type === 'select' && (
                <Select
                  label={param.label.toUpperCase()}
                  data={param.options ?? (param.key === 'aspect_ratio' ? model.defaultAspectRatios : [])}
                  {...form.getInputProps(param.key)}
                  styles={{ input: { borderRadius: '2px', border: '2px solid var(--mantine-color-default-border)' } }}
                />
              )}
              {param.type === 'number' && (
                <NumberInput
                  label={param.label.toUpperCase()}
                  placeholder={param.default?.toString()}
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  {...form.getInputProps(param.key)}
                  styles={{ input: { borderRadius: '2px', border: '2px solid var(--mantine-color-default-border)' } }}
                />
              )}
              {param.type === 'boolean' && (
                <Select
                  label={param.label.toUpperCase()}
                  data={[
                    { value: 'true', label: 'TRUE' },
                    { value: 'false', label: 'FALSE' },
                  ]}
                  defaultValue={param.default ? 'true' : 'false'}
                  {...form.getInputProps(param.key)}
                  styles={{ input: { borderRadius: '2px', border: '2px solid var(--mantine-color-default-border)' } }}
                />
              )}
              {param.type === 'text' && (
                <Textarea
                  label={param.label.toUpperCase()}
                  placeholder={`Enter ${param.label.toLowerCase()}`}
                  minRows={2}
                  {...form.getInputProps(param.key)}
                  styles={{ input: { borderRadius: '2px', border: '2px solid var(--mantine-color-default-border)' } }}
                />
              )}
            </Box>
          ))}

          {/* File input for models that require images */}
          {(model.requiresImage || model.parameters.some(p => p.key === 'image' || p.key === 'images' || p.key === 'src_ref_images')) && (
            <Box>
              <Text size="sm" fw={700} mb={4} style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {model.multipleImages ? 'SOURCE IMAGES (MULTIPLE)' : 'SOURCE IMAGE'}
              </Text>
              <Group>
                <FileButton
                  onChange={handleFileSelect}
                  accept="image/*"
                  multiple={model.multipleImages}
                >
                  {(props) => (
                    <Button {...props} variant="outline" color="indigo" leftSection={<Upload size={16} />} style={{ borderRadius: '2px', border: '2px solid var(--mantine-color-indigo-6)' }}>
                      SELECT FILES
                    </Button>
                  )}
                </FileButton>
                <Text size="xs" c="dimmed">
                  {files.length > 0 ? `${files.length} FILE(S) SELECTED` : 'SUPPORTS PNG, JPG, WEBP'}
                </Text>
              </Group>

              {files.length > 0 && (
                <SimpleGrid cols={{ base: 3, xs: 4, sm: 5 }} spacing="md" mt="md">
                  {files.map((file, i) => (
                    <ImagePreview
                      key={`${file.name}-${i}`}
                      file={file}
                      onRemove={() => setFiles(cur => cur.filter((_, idx) => idx !== i))}
                    />
                  ))}
                </SimpleGrid>
              )}
            </Box>
          )}

          {status && (
            <Alert icon={<Check size={16} />} title="CLOUD PROCESSING" color="indigo" variant="light" style={{ borderRadius: '2px', border: '2px solid var(--mantine-color-indigo-6)' }}>
              {status}
            </Alert>
          )}

          {error && (
            <Alert icon={<AlertCircle size={16} />} title="WORKFLOW INTERRUPTED" color="red" style={{ borderRadius: '2px', border: '2px solid var(--mantine-color-red-6)' }}>
              {error}
            </Alert>
          )}

          {latestGeneration && generationUrl && latestGeneration.status === 'succeeded' && (
            <Box mt="md">
              <Text size="sm" fw={700} mb={8} style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                GENERATED RESULT
              </Text>
              <Paper withBorder style={{ border: '2px solid var(--mantine-color-indigo-6)', borderRadius: '4px', overflow: 'hidden' }}>
                <AspectRatio ratio={parseRatio(model.defaultAspectRatios[0])}>
                  {latestGeneration.assetType === 'video' ? (
                    <video
                      src={generationUrl}
                      controls
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Image
                      src={generationUrl}
                      alt={latestGeneration.input.prompt}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  )}
                </AspectRatio>
              </Paper>
              <Text size="xs" c="dimmed" mt={8} style={{ letterSpacing: '0.02em' }}>
                Prompt: {latestGeneration.input.prompt}
              </Text>
            </Box>
          )}

          <Button
            type="submit"
            size="md"
            fullWidth
            loading={loading}
            leftSection={model.type.includes('video') ? <VideoIcon size={18} /> : <ImageIcon size={18} />}
            style={{ borderRadius: '2px', border: '2px solid var(--mantine-color-indigo-6)', height: '48px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}
          >
            GENERATE
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}
