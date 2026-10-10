import { Avatar, type AvatarProps } from "@mantine/core";
import type { SessionUser } from "../contexts/auth-context-value";

interface UserAvatarProps extends Omit<AvatarProps, "name" | "color" | "src" | "children"> {
  user: Pick<SessionUser, "firstName" | "lastName" | "username">;
}

/**
 * Avatar com iniciais e cor estável por usuário (padrão Google/GitHub/Slack).
 * Sem `children`: o Mantine só gera as iniciais quando não há conteúdo.
 */
export function UserAvatar({ user, ...props }: UserAvatarProps) {
  const fullName = `${user.firstName} ${user.lastName}`.trim() || user.username;
  return (
    <Avatar
      name={fullName}
      color="initials"
      variant="filled"
      autoContrast
      alt=""
      radius="xl"
      {...props}
    />
  );
}
