import { useEffect } from "react";
import type { FallbackProps } from "react-error-boundary";
import { Button, Card } from "./ui";

export function MainContentError({ error, resetErrorBoundary }: FallbackProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md overflow-hidden">
        <div className="border-b-2 border-tinta bg-coral px-5 py-4">
          <h2 className="font-display text-2xl text-white">Well, that went sideways</h2>
        </div>
        <div className="p-5">
          <p className="font-body text-sm text-tinta-soft">
            Something broke while loading the game.
          </p>
          <pre className="mt-3 max-h-40 overflow-auto rounded-2xl border-2 border-tinta bg-crema p-3 font-mono text-xs text-tinta">
            {`${error}`}
          </pre>
          <Button variant="coral" className="mt-4 w-full" onClick={resetErrorBoundary}>
            Try again
          </Button>
        </div>
      </Card>
    </div>
  );
}
