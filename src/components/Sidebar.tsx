import { NavLink, Stack, Text, Box } from '@mantine/core';
import { Image, Video, Library, Settings, Wand2, Grid } from 'lucide-react';
import type { View } from '../App';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <Stack gap="xs">
      <Box mb="md">
        <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Modules
        </Text>
      </Box>
      
      <NavLink
        label="Image Generation"
        description="Generate new images"
        leftSection={<Wand2 size={18} />}
        active={currentView === 'image-gen'}
        onClick={() => onViewChange('image-gen')}
        variant={currentView === 'image-gen' ? 'filled' : 'light'}
        color="indigo"
        style={{ borderRadius: '2px', border: currentView === 'image-gen' ? '2px solid var(--mantine-color-indigo-6)' : '2px solid transparent' }}
      />
      <NavLink
        label="Image Processing"
        description="Edit & generate images"
        leftSection={<Image size={18} />}
        active={currentView === 'image'}
        onClick={() => onViewChange('image')}
        variant={currentView === 'image' ? 'filled' : 'light'}
        color="indigo"
        style={{ borderRadius: '2px', border: currentView === 'image' ? '2px solid var(--mantine-color-indigo-6)' : '2px solid transparent' }}
      />
      <NavLink
        label="Video Generation"
        description="Create dynamic videos"
        leftSection={<Video size={18} />}
        active={currentView === 'video'}
        onClick={() => onViewChange('video')}
        variant={currentView === 'video' ? 'filled' : 'light'}
        color="indigo"
        style={{ borderRadius: '2px', border: currentView === 'video' ? '2px solid var(--mantine-color-indigo-6)' : '2px solid transparent' }}
      />
      <NavLink
        label="Gallery"
        description="View your history"
        leftSection={<Grid size={18} />}
        active={currentView === 'gallery'}
        onClick={() => onViewChange('gallery')}
        variant={currentView === 'gallery' ? 'filled' : 'light'}
        color="indigo"
        style={{ borderRadius: '2px', border: currentView === 'gallery' ? '2px solid var(--mantine-color-indigo-6)' : '2px solid transparent' }}
      />
      <NavLink
        label="Settings"
        description="Manage API keys"
        leftSection={<Settings size={18} />}
        active={currentView === 'settings'}
        onClick={() => onViewChange('settings')}
        variant={currentView === 'settings' ? 'filled' : 'light'}
        color="indigo"
        style={{ borderRadius: '2px', border: currentView === 'settings' ? '2px solid var(--mantine-color-indigo-6)' : '2px solid transparent' }}
      />
    </Stack>
  );
}
