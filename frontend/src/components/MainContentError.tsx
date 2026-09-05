import { useEffect } from "react";
import type { FallbackProps } from "react-error-boundary";

export function MainContentError({ error, resetErrorBoundary }: FallbackProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div>
      <p>Something went wrong:</p>
      <pre>{`${error}`}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}
