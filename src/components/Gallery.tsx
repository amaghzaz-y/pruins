import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, Text, Badge, Group, ActionIcon, Stack, Box, Center, Button, Skeleton, AspectRatio, Modal } from '@mantine/core';
import { modals } from '@mantine/modals';
import { Trash2, Download, Clock, X, Eye } from 'lucide-react';
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
    <Box p="lg" maw="100%" mx="auto">
      <Box style={{ borderBottom: '2px solid var(--mantine-color-default-border)', paddingBottom: 'md', marginBottom: 'lg' }}>
        <Text size="xl" fw={700} style={{ letterSpacing: '0.02em' }}>ACTIVITY FEED</Text>
        <Text size="sm" c="dimmed" style={{ letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '4px' }}>Your generated assets displayed in grid view.</Text>
      </Box>

      {predictions.length === 0 ? (
        <Center py={100} style={{ border: '2px dashed var(--mantine-color-default-border)', borderRadius: '4px' }}>
          <Stack align="center" gap="sm">
            <Text c="dimmed">NO GENERATIONS YET.</Text>
            <Button variant="outline" color="indigo" onClick={() => window.location.reload()} style={{ borderRadius: '2px', border: '2px solid var(--mantine-color-indigo-6)' }}>START CREATING</Button>
          </Stack>
        </Center>
      ) : (
        <Box
          className="gallery-grid-container"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
            alignItems: 'start'
          }}
        >
          {predictions.map((p) => (
            <GridCard key={p.id} prediction={p} />
          ))}
        </Box>
      )}
    </Box>
  );
}

function GridCard({ prediction: p }: { prediction: PredictionRecord }) {
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
    
    <Card 
      shadow="md" 
      padding={0} 
      withBorder 
      bg="var(--mantine-color-body)" 
      style={{ 
        border: '2px solid var(--mantine-color-default-border)', 
        borderRadius: '4px',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
      className="gallery-grid-card"
    >
      <Box 
        bg="var(--mantine-color-dark-8)" 
        style={{ 
          position: 'relative',
          aspectRatio: '16/9',
          overflow: 'hidden'
        }}
      >
        {p.status === 'succeeded' && assetUrl ? (
          p.assetType === 'video' ? (
            <video
              src={assetUrl}
              muted
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover', 
                display: 'block'
              }}
              onMouseEnter={(e) => e.currentTarget.play()}
              onMouseLeave={(e) => e.currentTarget.pause()}
            />
          ) : (
            <img
              src={assetUrl}
              alt={p.input.prompt}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover', 
                display: 'block'
              }}
              onClick={() => handleOpenModal(assetUrl, 'image')}
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
        
        {/* Overlay with actions on hover - only show if media is available */}
        {p.status === 'succeeded' && assetUrl && (
          <Box 
            className="gallery-card-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.8) 100%)',
              opacity: 0,
              transition: 'opacity 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '12px',
              pointerEvents: 'none',
              zIndex: 10
            }}
          >
          <Group gap="sm" mb="xs" style={{ pointerEvents: 'auto', zIndex: 11, position: 'relative' }}>
            <ActionIcon
              variant="filled"
              color="dark"
              size="sm"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(4px)',
                zIndex: 12,
                position: 'relative'
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (p.assetType === 'video') {
                  handleOpenModal(assetUrl || '', 'video');
                } else {
                  handleOpenModal(assetUrl || '', 'image');
                }
              }}
              disabled={p.status !== 'succeeded'}
            >
              <Eye size={14} />
            </ActionIcon>
            <ActionIcon
              variant="filled"
              color="dark"
              size="sm"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(4px)',
                zIndex: 12,
                position: 'relative'
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              disabled={p.status !== 'succeeded'}
            >
              <Download size={14} />
            </ActionIcon>
            <ActionIcon
              variant="filled"
              color="red"
              size="sm"
              style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(4px)',
                zIndex: 12,
                position: 'relative'
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
            >
              <Trash2 size={14} />
            </ActionIcon>
          </Group>
          <Text size="xs" c="white" lineClamp={2} style={{ fontWeight: 500, pointerEvents: 'none' }}>
            {p.input.prompt}
          </Text>
        </Box>
        )}
        
        {/* Badge in corner */}
        <Badge 
          color={p.model.includes('video') ? 'teal' : 'indigo'} 
          variant="filled" 
          size="xs"
          style={{ 
            position: 'absolute',
            top: '8px',
            left: '8px',
            borderRadius: '2px',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.05em'
          }}
        >
          {p.model.includes('video') ? 'VIDEO' : 'IMAGE'}
        </Badge>
      </Box>

      {/* Card footer with basic info and actions */}
      <Box p="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
        <Group justify="space-between" align="center">
          <Text size="xs" c="dimmed" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {new Date(p.createdAt).toLocaleDateString()}
          </Text>
          <Group gap="xs">
            <ActionIcon
              variant="outline"
              color="dark"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (p.assetType === 'video') {
                  handleOpenModal(assetUrl || '', 'video');
                } else {
                  handleOpenModal(assetUrl || '', 'image');
                }
              }}
              disabled={p.status !== 'succeeded'}
              style={{ borderRadius: '2px' }}
            >
              <Eye size={12} />
            </ActionIcon>
            <ActionIcon
              variant="outline"
              color="dark"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              disabled={p.status !== 'succeeded'}
              style={{ borderRadius: '2px' }}
            >
              <Download size={12} />
            </ActionIcon>
            <ActionIcon
              variant="outline"
              color="red"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              style={{ borderRadius: '2px' }}
            >
              <Trash2 size={12} />
            </ActionIcon>
          </Group>
        </Group>
      </Box>
    </Card>
    </>
  );
}

