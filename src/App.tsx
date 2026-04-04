import { useState, useEffect } from 'react';
import { 
  MantineProvider, 
  AppShell, 
  createTheme, 
  Text,
  ColorSchemeScript,
  Box,
  LoadingOverlay
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { PredictionForm } from './components/PredictionForm.tsx';
import { Gallery } from './components/Gallery.tsx';
import { getApiKey } from './db';

import '@mantine/core/styles.css';

export type View = 'image' | 'video' | 'gallery' | 'settings';

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
  const [currentView, setCurrentView] = useState<View>('image');
  const [opened, { toggle }] = useDisclosure();
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    getApiKey().then(key => setHasApiKey(!!key));
  }, []);

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
          {currentView === 'image' && <PredictionForm type="p-image-edit" />}
          {currentView === 'video' && <PredictionForm type="p-gen-video" />}
          {currentView === 'gallery' && <Gallery />}
          {currentView === 'settings' && (
            <Box py="xl">
              <Text size="xl" fw={700} mb="lg">Application Settings</Text>
              <Text c="dimmed">Configure your API key and local storage preferences here.</Text>
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
      <AppContent />
    </MantineProvider>
  );
}
