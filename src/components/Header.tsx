import { Group, Burger, Title, ActionIcon, useMantineColorScheme, Tooltip } from '@mantine/core';
import { Sun, Moon, Settings } from 'lucide-react';
import { type View } from '../App';

interface HeaderProps {
  opened: boolean;
  toggle: () => void;
  currentView: View;
}

export function Header({ opened, toggle, currentView }: HeaderProps) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const getTitle = () => {
    switch (currentView) {
      case 'image-gen': return 'Image Generation';
      case 'image': return 'Image Processing';
      case 'video': return 'Video Generation';
      case 'gallery': return 'Media Gallery';
      case 'settings': return 'Settings';
      default: return 'Pruna AI';
    }
  };

  return (
    <Group h="100%" px="md" justify="space-between">
      <Group h="100%">
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        <Title order={3} style={{ letterSpacing: '-0.02em' }}>{getTitle()}</Title>
      </Group>

      <Group>
        <Tooltip label="Toggle color scheme">
          <ActionIcon 
            variant="default" 
            onClick={() => toggleColorScheme()} 
            size="lg"
            aria-label="Toggle color scheme"
          >
            {colorScheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </ActionIcon>
        </Tooltip>
        
        <Tooltip label="System status">
          <ActionIcon variant="default" size="lg">
            <Settings size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}

// Helper for rem if not available
// (Removed local rem helper as we now import it from @mantine/core)
