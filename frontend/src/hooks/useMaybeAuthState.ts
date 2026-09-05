import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { server, SERVER_URL } from "../utils/server";

export function useMaybeAuthState() {
  const queryClient = useQueryClient();
  const {
    data: { data: authState },
  } = useSuspenseQuery({
    queryKey: ["authState"],
    queryFn: () =>
      server.api.player.me.get({
        throwHttpError: (response) => response.status !== 401,
      }),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["authState"] });
    if (authState) {
      queryClient.invalidateQueries({ queryKey: ["player", authState.id] });
    }
  }

  const logOut = useMutation({
    mutationFn: () => server.api.player.me.logout.post(),
    onSuccess: () => {
      invalidate();
    },
  });

  function logIn({ code }: { code: string }) {
    window.location.href = new URL(
      `/api/player/login?code=${encodeURIComponent(code)}&redirectUrl=${encodeURIComponent(window.location.origin)}`,
      SERVER_URL,
    ).toString();
  }

  const signUp = useMutation({
    mutationFn: (data: { name: string }) => server.api.player.post(data),
    onSuccess: (result) => {
      logIn({ code: result.data!.code });
    },
  });

  const update = useMutation({
    mutationFn: (data: { name: string }) => server.api.player.me.patch(data),
    onSuccess: () => {
      invalidate();
    },
  });

  return { authState, logOut, signUp, logIn, update, invalidate };
}
