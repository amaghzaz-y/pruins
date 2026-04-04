import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  SimpleGrid, 
  Card, 
  Image, 
  Text, 
  Badge, 
  Group, 
  ActionIcon, 
  Stack, 
  Box,
  Center,
  Button,
  Skeleton
} from '@mantine/core';
import { Trash2, Download, Play, Clock } from 'lucide-react';
import { db, type PredictionRecord } from '../db';

export function Gallery() {
  const predictions = useLiveQuery(() => db.predictions.orderBy('createdAt').reverse().toArray());

  if (!predictions) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={300} radius="md" />
        ))}
      </SimpleGrid>
    );
  }

  return (
    <Stack gap="xl">
      <Box>
        <Text size="xl" fw={700}>Media Gallery</Text>
        <Text size="sm" c="dimmed">Your localized generation history and assets.</Text>
      </Box>

      {predictions.length === 0 ? (
        <Center py={100}>
          <Stack align="center" gap="sm">
            <Text c="dimmed">No generations yet.</Text>
            <Button variant="light" color="indigo" onClick={() => window.location.reload()}>Start Creating</Button>
          </Stack>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {predictions.map((p) => (
            <MediaCard key={p.id} prediction={p} />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}

function MediaCard({ prediction: p }: { prediction: PredictionRecord }) {
  const [assetUrl, setAssetUrl] = useState<string | null>(null);

  useEffect(() => {
    if (p.assetBlob) {
      const url = URL.createObjectURL(p.assetBlob);
      setAssetUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [p.assetBlob]);

  const handleDelete = () => {
    if (confirm('Delete this generation?')) {
      db.predictions.delete(p.id);
    }
  };

  const handleDownload = () => {
    if (!p.assetBlob || !assetUrl) return;
    const a = document.createElement('a');
    a.href = assetUrl;
    a.download = `pruna-${p.id}.${p.assetType === 'video' ? 'mp4' : 'jpg'}`;
    a.click();
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder bg="var(--mantine-color-body)">
      <Card.Section pos="relative">
        {p.status === 'succeeded' ? (
          p.assetType === 'video' ? (
            <Box pos="relative">
              <video 
                src={assetUrl || ''} 
                style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} 
              />
              <Center pos="absolute" inset={0} style={{ pointerEvents: 'none' }}>
                <ActionIcon variant="filled" color="indigo" radius="xl" size="xl">
                  <Play size={20} />
                </ActionIcon>
              </Center>
            </Box>
          ) : (
            <Image
              src={assetUrl || ''}
              height={200}
              alt={p.input.prompt}
              fallbackSrc="https://placehold.co/600x400?text=Error+Loading"
            />
          )
        ) : (
          <Center h={200} bg="var(--mantine-color-dark-6)">
            <Stack align="center" gap="xs">
              <Clock size={32} opacity={0.5} />
              <Text size="xs" fw={700} c="dimmed">{p.status.toUpperCase()}</Text>
            </Stack>
          </Center>
        )}
      </Card.Section>

      <Stack mt="md" gap="xs" style={{ flexGrow: 1 }}>
        <Group justify="space-between">
          <Badge color={p.model.includes('video') ? 'teal' : 'indigo'} variant="light">
            {p.model.includes('video') ? 'Video' : 'Image'}
          </Badge>
          <Text size="xs" c="dimmed">
            {new Date(p.createdAt).toLocaleDateString()}
          </Text>
        </Group>

        <Text size="sm" lineClamp={2} style={{ flexGrow: 1 }}>
          {p.input.prompt}
        </Text>

        <Group gap="xs" mt="md">
          <Button 
            variant="light" 
            flex={1}
            leftSection={<Download size={16} />}
            onClick={handleDownload}
            disabled={p.status !== 'succeeded'}
          >
            Download
          </Button>
          <ActionIcon 
            variant="light" 
            color="red" 
            size="lg"
            onClick={handleDelete}
          >
            <Trash2 size={16} />
          </ActionIcon>
        </Group>
      </Stack>
    </Card>
  );
}
