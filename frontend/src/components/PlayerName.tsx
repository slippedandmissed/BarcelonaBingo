import { usePlayer } from "../hooks/usePlayer";

export function PlayerName({ playerId }: { playerId: string }) {
  const { player } = usePlayer({ playerId });
  return <>{player.name}</>;
}
