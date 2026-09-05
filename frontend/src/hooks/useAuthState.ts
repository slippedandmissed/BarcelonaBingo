import { useMaybeAuthState } from "./useMaybeAuthState";

export function useAuthState() {
  const { authState, ...rest } = useMaybeAuthState();

  return { authState: authState!, ...rest };
}
