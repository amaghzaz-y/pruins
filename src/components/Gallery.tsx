import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, Text, Badge, Group, ActionIcon, Stack, Box, Center, Button, Skeleton, Image, AspectRatio, Modal } from '@mantine/core';
import { modals } from '@mantine/modals';
import { Trash2, Download, Clock, Layers, X } from 'lucide-react';
import { useDisclosure } from '@mantine/hooks';
import { db, type PredictionRecord } from '../db';

export function Gallery() {
  const predictions = useLiveQuery(() => db.predictions.orderBy('createdAt').reverse().toArray());

  if (!predictions) {
    return (
      <Stack gap="xl" maw={800} mx="auto" w="100%">
        <Skeleton height={500} radius="0" />
        <Skeleton height={500} radius="0" />
      </Stack>
    );
  }

  return (
    <Stack gap="xl" maw={800} mx="auto" w="100%">
      <Box style={{ borderBottom: '2px solid var(--mantine-color-default-border)', paddingBottom: 'md' }}>
        <Text size="xl" fw={700} style={{ letterSpacing: '0.02em' }}>ACTIVITY FEED</Text>
        <Text size="sm" c="dimmed" style={{ letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '4px' }}>Your generated assets displayed in full quality.</Text>
      </Box>

      {predictions.length === 0 ? (
        <Center py={100} style={{ border: '2px dashed var(--mantine-color-default-border)', borderRadius: '4px' }}>
          <Stack align="center" gap="sm">
            <Text c="dimmed">NO GENERATIONS YET.</Text>
            <Button variant="outline" color="indigo" onClick={() => window.location.reload()} style={{ borderRadius: '2px', border: '2px solid var(--mantine-color-indigo-6)' }}>START CREATING</Button>
          </Stack>
        </Center>
      ) : (
        <Stack gap="3xl">
          {predictions.map((p) => (
            <MediaFeedCard key={p.id} prediction={p} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function MediaFeedCard({ prediction: p }: { prediction: PredictionRecord }) {
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [modalMedia, setModalMedia] = useState<{src: string, type: 'video' | 'image'}>({src: '', type: 'image'});

  const handleOpenModal = (src: string, type: 'video' | 'image') => {
    setModalMedia({src, type});
    open();
  };

  useEffect(() => {
    if (p.assetBlob) {
      const url = URL.createObjectURL(p.assetBlob);
      setAssetUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [p.assetBlob]);

  const handleDelete = () => {
    modals.openConfirmModal({
      title: 'Delete generation',
      centered: true,
      children: <Text size="sm">Are you sure you want to delete this generation?</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => db.predictions.delete(p.id),
    });
  };

  const handleDownload = () => {
    if (!p.assetBlob || !assetUrl) return;
    const a = document.createElement('a');
    a.href = assetUrl;
    a.download = `pruna-${p.id}.${p.assetType === 'video' ? 'mp4' : 'jpg'}`;
    a.click();
  };

  return (
    <>
    <Modal opened={opened} onClose={close} size="auto" centered padding={0} withCloseButton={false} zIndex={1000}>
      <Box pos="relative" bg="black" onClick={close} style={{ cursor: 'zoom-out', display: 'flex', justifyContent: 'center' }}>
        {modalMedia.type === 'video' ? (
          <video src={modalMedia.src} controls autoPlay style={{ maxWidth: '100vw', maxHeight: '95vh', display: 'block' }} />
        ) : (
          <img src={modalMedia.src} style={{ maxWidth: '100vw', maxHeight: '95vh', objectFit: 'contain', display: 'block' }} alt="Fullscreen preview" />
        )}
        <ActionIcon pos="absolute" top={10} right={10} onClick={close} radius="0" color="dark" variant="filled" size="lg">
          <X size={16} />
        </ActionIcon>
      </Box>
    </Modal>
    
    <Card shadow="md" padding={0} withBorder bg="var(--mantine-color-body)" style={{ border: '2px solid var(--mantine-color-default-border)', borderRadius: '4px' }}>
      <Box bg="var(--mantine-color-dark-8)" style={{ borderBottom: '2px solid var(--mantine-color-default-border)' }}>
        {p.status === 'succeeded' ? (
          p.assetType === 'video' ? (
            <video
              src={assetUrl || ''}
              controls
              style={{ width: '100%', maxHeight: '80vh', display: 'block', margin: '0 auto' }}
            />
          ) : (
            <img
              src={assetUrl || ''}
              alt={p.input.prompt}
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block', margin: '0 auto', cursor: 'zoom-in' }}
              onClick={() => handleOpenModal(assetUrl || '', 'image')}
            />
          )
        ) : (
          <AspectRatio ratio={16 / 9}>
            <Center>
              <Stack align="center" gap="xs">
                <Clock size={32} opacity={0.5} />
                <Text size="xs" fw={700} c="dimmed">PROCESSING: {p.status.toUpperCase()}</Text>
              </Stack>
            </Center>
          </AspectRatio>
        )}
      </Box>

      <Stack p="xl" gap="sm">
        <Group justify="space-between">
          <Badge color={p.model.includes('video') ? 'teal' : 'indigo'} variant="light" style={{ borderRadius: '2px', border: '2px solid' }}>
            {p.model.includes('video') ? 'VIDEO' : 'IMAGE'}
          </Badge>
          <Text size="xs" c="dimmed" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {new Date(p.createdAt).toLocaleDateString()}
          </Text>
        </Group>

        <Text size="lg" fw={500} style={{ letterSpacing: '0.02em' }}>
          {p.input.prompt}
        </Text>

        {(p.input.images || p.input.image) && (
          <Box mt="xs">
            <Group gap={6} mb={8}>
              <Layers size={14} color="gray" />
              <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>SOURCE ASSETS</Text>
            </Group>
            <Group gap="sm">
              {(Array.isArray(p.input.images) ? p.input.images : [p.input.image]).filter(Boolean).map((img: string, idx) => (
                <Image 
                  key={idx} 
                  src={img} 
                  w={80} h={80} 
                  radius="0" 
                  fit="cover" 
                  fallbackSrc="https://placehold.co/80x80?text=Source" 
                  style={{ cursor: 'zoom-in', border: '2px solid var(--mantine-color-default-border)' }}
                  onClick={() => handleOpenModal(img, 'image')}
                />
              ))}
            </Group>
          </Box>
        )}

        <Group gap="sm" mt="md">
          <Button
            variant="outline"
            flex={1}
            leftSection={<Download size={16} />}
            onClick={handleDownload}
            disabled={p.status !== 'succeeded'}
            size="md"
            style={{ borderRadius: '2px', border: '2px solid var(--mantine-color-indigo-6)', height: '44px', fontWeight: 600 }}
          >
            DOWNLOAD ASSET
          </Button>
          <ActionIcon
            variant="outline"
            color="red"
            size="xl"
            onClick={handleDelete}
            style={{ borderRadius: '2px', border: '2px solid var(--mantine-color-red-6)' }}
          >
            <Trash2 size={20} />
          </ActionIcon>
        </Group>
      </Stack>
    </Card>
    </>
  );
}
