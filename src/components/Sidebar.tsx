import { NavLink, Stack } from '@mantine/core';
import { Image, Video, Library, Settings } from 'lucide-react';
import type { View } from '../App';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <Stack gap="xs">
      <NavLink
        label="Image Processing"
        description="Edit & generate images"
        leftSection={<Image size={20} />}
        active={currentView === 'image'}
        onClick={() => onViewChange('image')}
        variant="light"
        color="indigo"
      />
      <NavLink
        label="Video Generation"
        description="Create dynamic videos"
        leftSection={<Video size={20} />}
        active={currentView === 'video'}
        onClick={() => onViewChange('video')}
        variant="light"
        color="indigo"
      />
      <NavLink
        label="Gallery"
        description="View your history"
        leftSection={<Library size={20} />}
        active={currentView === 'gallery'}
        onClick={() => onViewChange('gallery')}
        variant="light"
        color="indigo"
      />
      <NavLink
        label="Settings"
        description="Manage API keys"
        leftSection={<Settings size={20} />}
        active={currentView === 'settings'}
        onClick={() => onViewChange('settings')}
        variant="light"
        color="indigo"
      />
    </Stack>
  );
}
