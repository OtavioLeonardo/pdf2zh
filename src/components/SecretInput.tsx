import { useState } from "react";
import { ActionIcon, TextInput, type TextInputProps } from "@mantine/core";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

type SecretInputProps = Omit<TextInputProps, "type" | "rightSection">;

export function SecretInput({ className, ...props }: SecretInputProps) {
  const [revealed, setRevealed] = useState(false);
  const resolvedClassName = [className, revealed ? "" : "secret-input-masked"].filter(Boolean).join(" ");

  return (
    <TextInput
      {...props}
      className={resolvedClassName}
      autoCapitalize="off"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      rightSection={
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={revealed ? "隐藏密钥" : "显示密钥"}
          onClick={() => setRevealed((current) => !current)}
        >
          {revealed ? <IconEyeOff size={16} /> : <IconEye size={16} />}
        </ActionIcon>
      }
    />
  );
}
