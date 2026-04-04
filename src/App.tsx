
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { useState, useEffect } from 'react';
import {
  MantineProvider,
  AppShell,
  createTheme,
  Text,
  ColorSchemeScript,
  Box,
  LoadingOverlay,
  Stack,
  PasswordInput,
  Button,
  Group,
  Select,
  NumberInput
} from '@mantine/core';
import { Notifications, notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { useDisclosure } from '@mantine/hooks';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { PredictionForm } from './components/PredictionForm.tsx';
import { Gallery } from './components/Gallery.tsx';
import { getSettings, updateSettings } from './db';


export type View = 'image-gen' | 'image' | 'video' | 'gallery' | 'settings';

const theme = createTheme({
  primaryColor: 'indigo',
  primaryShade: 6,
  colors: {
    indigo: [
      '#f0f1ff',
      '#d9dbff',
      '#bfc2ff',
      '#9fa4ff',
      '#7e84ff',
      '#5c67ff',
      '#4a54e1',
      '#3941c4',
      '#292f9c',
      '#1a1d75',
    ],
  },
  fontFamily: 'Inter, sans-serif',
});

function AppContent() {
  const [currentView, setCurrentView] = useState<View>('image-gen');
  const [opened, { toggle }] = useDisclosure();
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [defaultAspectRatio, setDefaultAspectRatio] = useState('3:4');
  const [defaultSeed, setDefaultSeed] = useState<number | undefined>(undefined);

  useEffect(() => {
    getSettings().then(settings => {
      setHasApiKey(!!settings.apiKey);
      setApiKeyInput(settings.apiKey);
      setDefaultAspectRatio(settings.defaultAspectRatio);
      setDefaultSeed(settings.defaultSeed);
    });
  }, []);

  const handleSaveSettings = async () => {
    try {
      await updateSettings({
        apiKey: apiKeyInput,
        defaultAspectRatio,
        defaultSeed
      });
      setHasApiKey(!!apiKeyInput);
      notifications.show({
        title: 'Settings Saved',
        message: 'Your application settings have been updated successfully.',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save settings.',
        color: 'red',
      });
    }
  };

  if (hasApiKey === null) return <LoadingOverlay visible />;

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header px="md">
        <Header opened={opened} toggle={toggle} currentView={currentView} />
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Sidebar
          currentView={currentView}
          onViewChange={(v: View) => {
            setCurrentView(v);
            if (opened) toggle();
          }}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Box maw={1200} mx="auto" py="md">
          {currentView === 'image-gen' && <PredictionForm type="p-image" />}
          {currentView === 'image' && <PredictionForm type="p-image-edit" />}
          {currentView === 'video' && <PredictionForm type="p-gen-video" />}
          {currentView === 'gallery' && <Gallery />}
          {currentView === 'settings' && (
            <Box py="xl" maw={600}>
              <Stack gap="xl">
                <Box>
                  <Text size="xl" fw={700}>Application Settings</Text>
                  <Text c="dimmed">Configure your Pruna AI API key to enable image and video generation.</Text>
                </Box>

                <Stack gap="md">
                  <PasswordInput
                    label="Pruna API Key"
                    placeholder="Enter your API key"
                    description="Your key is stored locally in your browser's IndexedDB."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.currentTarget.value)}
                  />

                  <Group grow>
                    <Select
                      label="Default Aspect Ratio"
                      description="Default ratio for new predictions"
                      data={['3:4', '4:3', '9:16', '16:9', '1:1', '21:9']}
                      value={defaultAspectRatio}
                      onChange={(val) => setDefaultAspectRatio(val || '3:4')}
                    />
                    <NumberInput
                      label="Default Seed"
                      description="Leave empty for random seeds"
                      placeholder="Random"
                      value={defaultSeed}
                      onChange={(val) => setDefaultSeed(val as number || undefined)}
                    />
                  </Group>

                  <Group justify="flex-end">
                    <Button onClick={handleSaveSettings} color="indigo">
                      Save Settings
                    </Button>
                  </Group>
                </Stack>
              </Stack>
            </Box>
          )}
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}

export default function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <ColorSchemeScript defaultColorScheme="dark" />
      <Notifications position="top-right" />
      <ModalsProvider>
        <AppContent />
      </ModalsProvider>
    </MantineProvider>
  );
}
