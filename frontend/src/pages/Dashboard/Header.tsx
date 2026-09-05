import { useId, useState } from "react";
import { useAuthState } from "../../hooks/useAuthState";
import { Avatar, BingoChips, Button, CopyButton, ModalShell, TextInput } from "../../components/ui";

export function Header() {
  const { authState, logOut, update } = useAuthState();
  const userModalId = useId();

  const [newName, setNewName] = useState(authState.name);

  return (
    <>
      <header className="sticky top-0 z-20 border-b-2 border-tinta bg-crema/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <BingoChips className="hidden sm:flex" />
            <span className="font-display text-lg leading-none">
              <span className="text-coral">Barcelona</span> <span className="text-mar">Bingo</span>
            </span>
          </div>

          <button
            // @ts-expect-error - invoker commands API
            command="show-modal"
            commandfor={userModalId}
            className="flex items-center gap-2 rounded-full border-2 border-tinta bg-white py-1 pl-1 pr-3 font-heading text-sm font-semibold shadow-hard-sm transition-all hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <Avatar name={authState.name} size="sm" />
            <span className="max-w-[8rem] truncate">{authState.name}</span>
          </button>
        </div>
      </header>

      <dialog id={userModalId}>
        <ModalShell title="Your player" modalId={userModalId} accent="bg-mar">
          <label className="font-heading text-sm font-semibold">Display name</label>
          <div className="mt-2 flex gap-2">
            <TextInput type="text" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Button
              // @ts-expect-error - invoker commands API
              command="close"
              commandfor={userModalId}
              variant="sea"
              size="sm"
              onClick={() => update.mutate({ name: newName })}
              disabled={update.isPending || !newName.trim()}
              className="shrink-0"
            >
              Save
            </Button>
          </div>

          <div className="mt-5 rounded-2xl border-2 border-dashed border-tinta bg-crema p-4">
            <p className="font-heading text-xs font-semibold uppercase tracking-wide text-tinta-soft">
              Recovery code
            </p>
            <p className="mt-1 font-body text-xs text-tinta-soft">
              Keep this safe — it&apos;s the only way back into your card.
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <code className="truncate font-mono text-sm">{authState.code}</code>
              <CopyButton value={authState.code} />
            </div>
          </div>

          <Button
            variant="danger"
            className="mt-5 w-full"
            onClick={() => logOut.mutate()}
            disabled={logOut.isPending}
          >
            Log out
          </Button>
        </ModalShell>
      </dialog>
    </>
  );
}
