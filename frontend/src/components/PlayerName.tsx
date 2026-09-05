import type { ReactNode } from "react";
import { usePlayer } from "../hooks/usePlayer";

export function PlayerName({
  playerId,
  children,
}: {
  playerId: string;
  children?: (name: string) => ReactNode;
}) {
  const { player } = usePlayer({ playerId });
  if (children) return <>{children(player.name)}</>;
  return <>{player.name}</>;
}
