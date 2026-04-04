import {
  Group,
  Burger,
  Title,
  ActionIcon,
  useMantineColorScheme,
  Tooltip,
  Badge,
} from "@mantine/core";
import { Sun, Moon, Settings, Zap } from "lucide-react";
import { type View } from "../App";

interface HeaderProps {
  opened: boolean;
  toggle: () => void;
  currentView: View;
}

export function Header({ opened, toggle, currentView }: HeaderProps) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const getTitle = () => {
    switch (currentView) {
      case "generator":
        return "GENERATION STUDIO";
      case "gallery":
        return "MEDIA GALLERY";
      case "settings":
        return "SETTINGS";
      default:
        return "PRUNA AI";
    }
  };

  return (
    <Group h="100%" px="md" justify="space-between" wrap="nowrap">
      <Group h="100%" wrap="nowrap">
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        <Group gap="xs" wrap="nowrap">
          <Title
            order={3}
            style={{ letterSpacing: "0.05em", textTransform: "uppercase" }}
          >
            {getTitle()}
          </Title>
          <Badge
            variant="light"
            color="indigo"
            size="sm"
            leftSection={<Zap size={12} />}
          >
            AI
          </Badge>
        </Group>
      </Group>

      <Group gap="sm">
        <Tooltip label="Toggle color scheme">
          <ActionIcon
            variant="default"
            onClick={() => toggleColorScheme()}
            size="lg"
            aria-label="Toggle color scheme"
            style={{ borderRadius: "2px" }}
          >
            {colorScheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </ActionIcon>
        </Tooltip>

        <Tooltip label="System status">
          <ActionIcon
            variant="default"
            size="lg"
            style={{ borderRadius: "2px" }}
          >
            <Settings size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}
