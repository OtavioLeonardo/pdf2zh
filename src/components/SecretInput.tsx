import { useState } from "react";
import { ActionIcon, Anchor, Group, HoverCard, Stack, Text, TextInput, type TextInputProps } from "@mantine/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

export type SecretInputHelpLink = {
  label: string;
  url: string;
};

type SecretInputProps = Omit<TextInputProps, "type" | "rightSection"> & {
  helpTitle?: string;
  helpDescription?: string;
  helpSteps?: string[];
  helpLinks?: SecretInputHelpLink[];
};

export function SecretInput({
  className,
  helpTitle,
  helpDescription,
  helpSteps,
  helpLinks,
  label,
  ...props
}: SecretInputProps) {
  const [revealed, setRevealed] = useState(false);
  const resolvedClassName = [className, revealed ? "" : "secret-input-masked"].filter(Boolean).join(" ");
  const hasHelp = Boolean(helpTitle || helpDescription || helpSteps?.length || helpLinks?.length);
  const resolvedLabel = hasHelp ? (
    <Group gap={6} align="center" wrap="nowrap">
      <span>{label}</span>
      <HoverCard width={320} shadow="md" radius="lg" position="right" withArrow>
        <HoverCard.Target>
          <ActionIcon
            variant="subtle"
            color="appleBlue"
            size="xs"
            radius="xl"
            aria-label={`${label ?? "密钥"}申请帮助`}
          >
            ?
          </ActionIcon>
        </HoverCard.Target>
        <HoverCard.Dropdown>
          <Stack gap={8}>
            {helpTitle ? (
              <Text size="sm" fw={700}>
                {helpTitle}
              </Text>
            ) : null}
            {helpDescription ? (
              <Text size="xs" c="dimmed" lh={1.55}>
                {helpDescription}
              </Text>
            ) : null}
            {helpSteps?.map((step, index) => (
              <Text key={step} size="xs" lh={1.55}>
                {index + 1}. {step}
              </Text>
            ))}
            {helpLinks?.map((link) => (
              <Anchor
                key={link.url}
                component="button"
                type="button"
                size="xs"
                className="secret-input-help-link"
                onClick={() => void openUrl(link.url)}
              >
                {link.label}
              </Anchor>
            ))}
          </Stack>
        </HoverCard.Dropdown>
      </HoverCard>
    </Group>
  ) : (
    label
  );

  return (
    <TextInput
      {...props}
      label={resolvedLabel}
      className={resolvedClassName}
      autoCapitalize="off"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      rightSection={
        <ActionIcon
          variant="subtle"
          color="appleBlue"
          aria-label={revealed ? "隐藏密钥" : "显示密钥"}
          onClick={() => setRevealed((current) => !current)}
        >
          {revealed ? <IconEyeOff size={16} /> : <IconEye size={16} />}
        </ActionIcon>
      }
    />
  );
}
