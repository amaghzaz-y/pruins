import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { useState, useEffect } from "react";
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
  NumberInput,
  ScrollArea,
  Paper,
  SimpleGrid,
  Badge,
} from "@mantine/core";
import { Notifications, notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import { useDisclosure } from "@mantine/hooks";
import { Sidebar } from "./components/Sidebar.tsx";
import { Header } from "./components/Header.tsx";
import { PredictionForm } from "./components/PredictionForm.tsx";
import { Gallery } from "./components/Gallery.tsx";
import { getSettings, updateSettings } from "./db";
import { modelGroups, type ModelConfig } from "./config/models";

export type View = "generator" | "gallery" | "settings";

const theme = createTheme({
  primaryColor: "indigo",
  primaryShade: 6,
  colors: {
    indigo: [
      "#f0f1ff",
      "#d9dbff",
      "#bfc2ff",
      "#9fa4ff",
      "#7e84ff",
      "#6366f1",
      "#4f46e5",
      "#3941c4",
      "#292f9c",
      "#1a1d75",
    ],
  },
  fontFamily: "Inter, sans-serif",
  radius: {
    sm: "2px",
    md: "4px",
    lg: "6px",
    xl: "8px",
  },
  headings: {
    fontWeight: "700",
  },
  defaultRadius: "sm",
  components: {
    Button: {
      defaultProps: {
        radius: "sm",
      },
    },
    Input: {
      defaultProps: {
        radius: "sm",
      },
    },
    Card: {
      defaultProps: {
        radius: "sm",
      },
    },
    Paper: {
      defaultProps: {
        radius: "sm",
      },
    },
  },
});

function AppContent() {
  const [currentView, setCurrentView] = useState<View>("generator");
  const [opened, { toggle }] = useDisclosure();
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [defaultAspectRatio, setDefaultAspectRatio] = useState("3:4");
  const [defaultSeed, setDefaultSeed] = useState<number | undefined>(undefined);
  const [selectedModelId, setSelectedModelId] = useState<string>("p-image");

  useEffect(() => {
    getSettings().then((settings) => {
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
        defaultSeed,
      });
      setHasApiKey(!!apiKeyInput);
      notifications.show({
        title: "Settings Saved",
        message: "Your application settings have been updated successfully.",
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to save settings.",
        color: "red",
      });
    }
  };

  if (hasApiKey === null) return <LoadingOverlay visible />;

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 280,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header
        px="md"
        style={{
          borderBottom: "2px solid var(--mantine-color-default-border)",
        }}
      >
        <Header opened={opened} toggle={toggle} currentView={currentView} />
      </AppShell.Header>

      <AppShell.Navbar
        p="md"
        style={{ borderRight: "2px solid var(--mantine-color-default-border)" }}
      >
        <Sidebar
          currentView={currentView}
          onViewChange={(v: View) => {
            setCurrentView(v);
            if (opened) toggle();
          }}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Box maw={1400} mx="auto" py="md">
          {currentView === "generator" && (
            <Stack gap="xl">
              <Box
                style={{
                  borderBottom: "2px solid var(--mantine-color-default-border)",
                  paddingBottom: "md",
                }}
              >
                <Text size="xl" fw={700} style={{ letterSpacing: "0.02em" }}>
                  GENERATION STUDIO
                </Text>
                <Text
                  c="dimmed"
                  size="sm"
                  style={{
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    marginTop: "4px",
                  }}
                >
                  Select a model and create your content
                </Text>
              </Box>

              <Group align="flex-start" grow>
                <Box style={{ flex: 1 }}>
                  <Text size="sm" fw={700} mb={8} style={{ letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    SELECT MODEL
                  </Text>
                  <ScrollArea type="auto" h={600}>
                    <Stack gap="sm">
                      {modelGroups.map((group) => (
                        <Box key={group.label} mb="md">
                          <Text
                            size="xs"
                            c="dimmed"
                            fw={700}
                            mb={8}
                            style={{
                              letterSpacing: "0.05em",
                              textTransform: "uppercase",
                              borderBottom: "1px solid var(--mantine-color-default-border)",
                              paddingBottom: 4,
                            }}
                          >
                            {group.label}
                          </Text>
                          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                            {group.models.map((model: ModelConfig) => (
                              <Paper
                                key={model.id}
                                p="md"
                                withBorder
                                style={{
                                  border:
                                    selectedModelId === model.id
                                      ? "2px solid var(--mantine-color-indigo-6)"
                                      : "2px solid var(--mantine-color-default-border)",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  backgroundColor:
                                    selectedModelId === model.id
                                      ? "var(--mantine-color-dark-8)"
                                      : "transparent",
                                }}
                                onClick={() => setSelectedModelId(model.id)}
                              >
                                <Stack gap="xs">
                                  <Group justify="space-between" align="flex-start">
                                    <Text size="sm" fw={700} style={{ letterSpacing: "0.02em" }}>
                                      {model.name}
                                    </Text>
                                    <Badge
                                      color={
                                        model.type.includes("video")
                                          ? "teal"
                                          : model.type.includes("edit")
                                          ? "orange"
                                          : "indigo"
                                      }
                                      variant="light"
                                      size="xs"
                                    >
                                      {model.type.toUpperCase().replace("-", " ")}
                                    </Badge>
                                  </Group>
                                  <Text size="xs" c="dimmed" lineClamp={2}>
                                    {model.description}
                                  </Text>
                                  <Group gap="xs" mt={4}>
                                    <Text size="xs" c="indigo" fw={700}>
                                      {model.pricing}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      |
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {model.rateLimit}
                                    </Text>
                                  </Group>
                                  <Text
                                    size="xs"
                                    c="dimmed"
                                    mt={4}
                                    style={{ textDecoration: "underline", cursor: "pointer" }}
                                  >
                                    {model.documentation}
                                  </Text>
                                </Stack>
                              </Paper>
                            ))}
                          </SimpleGrid>
                        </Box>
                      ))}
                    </Stack>
                  </ScrollArea>
                </Box>

                <Box style={{ flex: 1, minWidth: 500 }}>
                  <PredictionForm selectedModelId={selectedModelId} />
                </Box>
              </Group>
            </Stack>
          )}
          {currentView === "gallery" && <Gallery />}
          {currentView === "settings" && (
            <Box py="xl" maw={600}>
              <Stack gap="xl">
                <Box
                  style={{
                    borderBottom:
                      "2px solid var(--mantine-color-default-border)",
                    paddingBottom: "md",
                  }}
                >
                  <Text size="xl" fw={700} style={{ letterSpacing: "0.02em" }}>
                    APPLICATION SETTINGS
                  </Text>
                  <Text
                    c="dimmed"
                    size="sm"
                    style={{
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      marginTop: "4px",
                    }}
                  >
                    Configure your Pruna AI API key to enable image and video
                    generation.
                  </Text>
                </Box>

                <Stack gap="md">
                  <PasswordInput
                    label="PRUNA API KEY"
                    placeholder="Enter your API key"
                    description="Your key is stored locally in your browser's IndexedDB."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.currentTarget.value)}
                    styles={{
                      input: {
                        borderRadius: "2px",
                        border: "2px solid var(--mantine-color-default-border)",
                      },
                    }}
                  />

                  <Group grow>
                    <Select
                      label="DEFAULT ASPECT RATIO"
                      description="Default ratio for new predictions"
                      data={["3:4", "4:3", "9:16", "16:9", "1:1", "21:9"]}
                      value={defaultAspectRatio}
                      onChange={(val) => setDefaultAspectRatio(val || "3:4")}
                      styles={{
                        input: {
                          borderRadius: "2px",
                          border:
                            "2px solid var(--mantine-color-default-border)",
                        },
                      }}
                    />
                    <NumberInput
                      label="DEFAULT SEED"
                      description="Leave empty for random seeds"
                      placeholder="Random"
                      value={defaultSeed}
                      onChange={(val) =>
                        setDefaultSeed((val as number) || undefined)
                      }
                      styles={{
                        input: {
                          borderRadius: "2px",
                          border:
                            "2px solid var(--mantine-color-default-border)",
                        },
                      }}
                    />
                  </Group>

                  <Group justify="flex-end">
                    <Button
                      onClick={handleSaveSettings}
                      color="indigo"
                      style={{
                        borderRadius: "2px",
                        border: "2px solid var(--mantine-color-indigo-6)",
                        height: "44px",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}
                    >
                      SAVE SETTINGS
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
