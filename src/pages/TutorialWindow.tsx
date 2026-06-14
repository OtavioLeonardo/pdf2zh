import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  AppShell,
  Box,
  Button,
  Code,
  Divider,
  Group,
  List,
  Loader,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconBook2, IconExternalLink } from "@tabler/icons-react";
import { type TutorialContent } from "../app-types";

function renderMarkdown(markdown: string) {
  const sections = markdown.split(/\n##\s+/).filter(Boolean);

  return sections.map((section, index) => {
    const normalized = index === 0 ? section : `## ${section}`;
    const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
    const headingLine = lines[0] ?? "";
    const heading = headingLine.replace(/^#+\s*/, "");
    const body = lines.slice(1);
    const bullets = body.filter((line) => /^-\s+/.test(line));
    const prose = body.filter((line) => !/^-+\s+/.test(line) && !/^```/.test(line));
    const codeBlocks = normalized.match(/```[\s\S]*?```/g) ?? [];

    return (
      <Stack key={`${heading}-${index}`} gap="sm">
        <Title order={3}>{heading}</Title>
        {prose.map((line, lineIndex) => (
          <Text key={lineIndex} c="dimmed" size="sm">
            {line}
          </Text>
        ))}
        {bullets.length > 0 ? (
          <List size="sm" spacing="xs">
            {bullets.map((line, lineIndex) => (
              <List.Item key={lineIndex}>{line.replace(/^-\s+/, "")}</List.Item>
            ))}
          </List>
        ) : null}
        {codeBlocks.map((block, blockIndex) => (
          <Code key={blockIndex} block className="tutorial-code">
            {block.replace(/^```[^\n]*\n?/, "").replace(/\n```$/, "")}
          </Code>
        ))}
      </Stack>
    );
  });
}

export function TutorialWindow() {
  const [content, setContent] = useState<TutorialContent | null>(null);

  useEffect(() => {
    void invoke<TutorialContent>("get_tutorial_content").then(setContent);
  }, []);

  return (
    <AppShell className="app-shell settings-shell" padding={0}>
      <AppShell.Main className="settings-main">
        <Stack gap="lg">
          <Box className="window-page-header">
            <Group justify="space-between" align="flex-start">
              <Group gap="sm">
                <ThemeIcon size={42} radius="xl" color="appleBlue" variant="light">
                  <IconBook2 size={22} />
                </ThemeIcon>
                <Box>
                  <Title order={2}>使用教程</Title>
                  <Text c="dimmed" size="sm">
                    主页面只保留功能操作，帮助说明统一放在这里。
                  </Text>
                </Box>
              </Group>
              <Button
                variant="light"
                leftSection={<IconExternalLink size={16} />}
                onClick={() => void invoke("open_tutorial_source")}
              >
                打开 {content?.sourceLabel ?? "README"}
              </Button>
            </Group>
          </Box>

          <Divider />

          {content ? (
            <Stack gap="xl" className="tutorial-body">
              {renderMarkdown(content.markdown)}
            </Stack>
          ) : (
            <Group justify="center" py="xl">
              <Loader size="sm" />
            </Group>
          )}
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}
