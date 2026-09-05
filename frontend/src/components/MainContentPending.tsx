import { BingoBall } from "./ui";

export function MainContentPending() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
      <BingoBall />
      <p className="font-heading text-sm font-semibold text-tinta-soft">Shuffling the cards…</p>
    </div>
  );
}
