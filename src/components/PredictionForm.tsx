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
  SimpleGrid
} from '@mantine/core';
import { useState, useEffect } from 'react';
import { useForm } from '@mantine/form';
import { Upload, Image as ImageIcon, Video as VideoIcon, AlertCircle, Check, X } from 'lucide-react';
import { PApiClient } from '../api/client';
import { db, getSettings } from '../db';

interface PredictionFormProps {
  type: 'p-image' | 'p-image-edit' | 'p-gen-video';
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
    <Box pos="relative">
      <AspectRatio ratio={1}>
        <Image src={url} radius="md" fit="cover" style={{ border: '1px solid var(--mantine-color-default-border)' }} />
      </AspectRatio>
      <ActionIcon 
        pos="absolute" 
        top={-8} 
        right={-8} 
        color="red" 
        size="sm" 
        radius="xl" 
        variant="filled"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        style={{ zIndex: 10 }}
      >
        <X size={12} />
      </ActionIcon>
    </Box>
  );
}

export function PredictionForm({ type }: PredictionFormProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const isImageControl = type === 'p-image-edit';
  const isImageGen = type === 'p-image';

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

  useEffect(() => {
    getSettings().then(settings => {
      form.setValues({
        aspectRatio: settings.defaultAspectRatio,
        seed: settings.defaultSeed,
      });
    });
  }, []);

  const handleSubmit = async (values: typeof form.values) => {
    const settings = await getSettings();
    const apiKey = settings.apiKey;
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
      } else if (type === 'p-gen-video') {
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
            <Text size="xl" fw={700}>
              {type === 'p-image-edit' ? 'Image Reference Editing' : 
               type === 'p-image' ? 'Image Generation' : 'Video Generation'}
            </Text>
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
              data={['3:4', '4:3', '9:16', '16:9', '1:1', '21:9']}
              {...form.getInputProps('aspectRatio')}
            />
            <NumberInput
              label="Seed"
              placeholder="Random"
              {...form.getInputProps('seed')}
            />
          </Group>

          {type !== 'p-image' && (
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
            leftSection={type === 'p-gen-video' ? <VideoIcon size={18} /> : <ImageIcon size={18} />}
          >
            {isImageControl ? 'Initialize Cloud Processing' : isImageGen ? 'Generate Image' : 'Queue Video Generation'}
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}
