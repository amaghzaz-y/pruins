import { NavLink, Stack, Text, Box } from '@mantine/core';
import { Settings, Wand2, Grid } from 'lucide-react';
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
        label="Generation Studio"
        description="Create images & videos"
        leftSection={<Wand2 size={18} />}
        active={currentView === 'generator'}
        onClick={() => onViewChange('generator')}
        variant={currentView === 'generator' ? 'filled' : 'light'}
        color="indigo"
        style={{ borderRadius: '2px', border: currentView === 'generator' ? '2px solid var(--mantine-color-indigo-6)' : '2px solid transparent' }}
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
