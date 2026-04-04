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
  Badge,
  Alert
} from '@mantine/core';
import { useState } from 'react';
import { useForm } from '@mantine/form';
import { Upload, Image as ImageIcon, Video as VideoIcon, AlertCircle, Check } from 'lucide-react';
import { PApiClient } from '../api/client';
import { db } from '../db';
import { getApiKey } from '../db';

interface PredictionFormProps {
  type: 'p-image-edit' | 'p-gen-video';
}

export function PredictionForm({ type }: PredictionFormProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const isImageControl = type === 'p-image-edit';

  const form = useForm({
    initialValues: {
      prompt: '',
      aspectRatio: '16:9',
      seed: undefined as number | undefined,
    },
    validate: {
      prompt: (val) => (val.length < 3 ? 'Prompt is too short' : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    const apiKey = await getApiKey();
    if (!apiKey) {
      setError('Pruna API Key not found. Please set it in Settings.');
      return;
    }

    if (isImageControl && files.length === 0) {
      setError('At least one source image is required.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatus('Uploading assets...');

    const client = new PApiClient(apiKey);

    try {
      // 1. Upload files
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const uploaded = await client.uploadFile(file);
        uploadedUrls.push(uploaded.urls.get);
      }

      // 2. Create prediction
      setStatus('Initializing prediction...');
      const inputPayload: any = {
        prompt: values.prompt,
        aspect_ratio: values.aspectRatio,
        seed: values.seed,
        disable_safety_checker: true,
      };

      if (isImageControl) {
        inputPayload.images = uploadedUrls;
      } else {
        if (uploadedUrls.length > 0) inputPayload.image = uploadedUrls[0];
        inputPayload.resolution = '720p';
        inputPayload.fps = 24;
        inputPayload.duration = 5;
      }

      const prediction = await client.createPrediction(type, inputPayload);
      const predId = (prediction as any).id;

      // 3. Save initial record
      await db.predictions.put({
        id: predId,
        model: type,
        input: inputPayload,
        status: 'starting',
        createdAt: Date.now(),
      });

      // 4. Poll
      setStatus('Processing on Pruna Cloud...');
      await pollPrediction(client, predId);

      setStatus('Completed!');
      form.reset();
      setFiles([]);
    } catch (err: any) {
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
              assetType: resp.generation_url!.endsWith('.mp4') ? 'video' : 'image'
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

  // Improved file handler
  const handleFileSelect = (payload: File | File[] | null) => {
    if (!payload) return;
    const selectedFiles = Array.isArray(payload) ? payload : [payload];
    if (isImageControl) {
      setFiles(cur => [...cur, ...selectedFiles].slice(0, 5));
    } else {
      setFiles([selectedFiles[0]]);
    }
  };

  return (
    <Paper withBorder p="xl" radius="md" pos="relative" bg="var(--mantine-color-body)">
      <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: 'sm', blur: 2 }} />
      
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="lg">
          <Box>
            <Text size="xl" fw={700}>{isImageControl ? 'Image Reference Editing' : 'Video Generation'}</Text>
            <Text size="xs" c="dimmed">Powered by Pruna AI Cloud</Text>
          </Box>
          
          <Textarea
            label="Visual Prompt"
            placeholder="A cinematic aerial shot of a neon cyberpunk city..."
            required
            minRows={4}
            {...form.getInputProps('prompt')}
          />

          <Group grow>
            <Select
              label="Aspect Ratio"
              data={['1:1', '16:9', '9:16', '4:3', '21:9']}
              {...form.getInputProps('aspectRatio')}
            />
            <NumberInput
              label="Seed"
              placeholder="Random"
              {...form.getInputProps('seed')}
            />
          </Group>

          <Box>
            <Text size="sm" fw={500} mb={4}>{isImageControl ? 'Source Images (1-5)' : 'Base Frame (Optional)'}</Text>
            <Group>
              <FileButton 
                onChange={handleFileSelect} 
                accept="image/*" 
                multiple={isImageControl}
              >
                {(props) => (
                  <Button {...props} variant="light" color="indigo" leftSection={<Upload size={16} />}>
                    Select Files
                  </Button>
                )}
              </FileButton>
              <Text size="xs" c="dimmed">
                {files.length > 0 ? `${files.length} file(s) selected` : 'Supports PNG, JPG, WEBP'}
              </Text>
            </Group>
            
            {files.length > 0 && (
              <Group gap="xs" mt="xs">
                {files.map((file, i) => (
                  <Badge 
                    key={i} 
                    variant="dot" 
                    color="indigo" 
                    size="sm" 
                    style={{ cursor: 'pointer' }}
                    onClick={() => setFiles(cur => cur.filter((_, idx) => idx !== i))}
                  >
                    {file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}
                  </Badge>
                ))}
              </Group>
            )}
          </Box>

          {status && (
            <Alert icon={<Check size={16} />} title="Cloud Processing" color="indigo" variant="light">
              {status}
            </Alert>
          )}

          {error && (
            <Alert icon={<AlertCircle size={16} />} title="Workflow Interrupted" color="red">
              {error}
            </Alert>
          )}

          <Button 
            type="submit" 
            size="md" 
            fullWidth 
            loading={loading}
            leftSection={isImageControl ? <ImageIcon size={18} /> : <VideoIcon size={18} />}
          >
            {isImageControl ? 'Initialize Cloud Processing' : 'Queue Video Generation'}
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}
