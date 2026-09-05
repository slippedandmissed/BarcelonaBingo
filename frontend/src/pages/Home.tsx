import { useState } from "react";
import { useMaybeAuthState } from "../hooks/useMaybeAuthState";
import { Button, BingoChips, Card, TextInput } from "../components/ui";

export function Home() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <span className="inline-block -rotate-2 rounded-full border-2 border-tinta bg-mar px-4 py-1 font-heading text-xs font-semibold uppercase tracking-widest text-white shadow-hard-sm">
            Don&apos;t Get Got · Holiday Edition
          </span>
          <h1 className="mt-5 font-display text-6xl leading-[0.9] sm:text-7xl">
            <span className="block text-coral">Barcelona</span>
            <span className="block text-mar">Bingo</span>
          </h1>
          <BingoChips className="mt-6" />
          <p className="mx-auto mt-5 max-w-xs font-body text-sm text-tinta-soft">
            Sneaky challenges. Five in a row. Whoever fills their card first without getting caught
            wins the trip.
          </p>
        </header>

        <LoginOrSignUpForm />
      </div>
    </div>
  );
}

function LoginOrSignUpForm() {
  const { logIn, signUp } = useMaybeAuthState();
  const [name, setName] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");

  return (
    <Card className="p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) signUp.mutate({ name: name.trim() });
        }}
      >
        <h2 className="font-heading text-xl font-semibold">Join the game</h2>
        <p className="mt-1 font-body text-sm text-tinta-soft">
          Pick a name your friends will recognise.
        </p>
        <TextInput
          className="mt-4"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={signUp.isPending}
          autoFocus
        />
        <Button
          type="submit"
          variant="coral"
          className="mt-3 w-full"
          disabled={signUp.isPending || !name.trim()}
        >
          {signUp.isPending ? "Setting up…" : "Create my card"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-tinta-soft">
        <span className="h-0.5 flex-1 rounded bg-tinta/15" />
        <span className="font-heading text-xs font-semibold uppercase tracking-widest">or</span>
        <span className="h-0.5 flex-1 rounded bg-tinta/15" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (recoveryCode.trim()) logIn({ code: recoveryCode.trim() });
        }}
      >
        <h2 className="font-heading text-xl font-semibold">Been here before?</h2>
        <p className="mt-1 font-body text-sm text-tinta-soft">
          Enter the recovery code from your last visit.
        </p>
        <TextInput
          className="mt-4 font-mono tracking-wide"
          type="text"
          placeholder="Recovery code"
          value={recoveryCode}
          onChange={(e) => setRecoveryCode(e.target.value)}
        />
        <Button type="submit" variant="sea" className="mt-3 w-full" disabled={!recoveryCode.trim()}>
          Log back in
        </Button>
      </form>
    </Card>
  );
}
