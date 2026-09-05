import { useId, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faX } from "@fortawesome/free-solid-svg-icons";
import { useAuthState } from "../../hooks/useAuthState";

export function Header() {
  const { authState, logOut, update } = useAuthState();
  const userModalId = useId();

  const [newName, setNewName] = useState(authState.name);

  return (
    <>
      <header>
        <div className="flex justify-between">
          <button
            // @ts-expect-error
            command="show-modal"
            commandfor={userModalId}
          >
            {authState.name}
          </button>
        </div>
        <hr />
      </header>
      <dialog id={userModalId}>
        <button
          // @ts-expect-error
          command="close"
          commandfor={userModalId}
        >
          <FontAwesomeIcon icon={faX} />
        </button>

        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button
          // @ts-expect-error
          command="close"
          commandfor={userModalId}
          onClick={() => update.mutate({ name: newName })}
          disabled={update.isPending}
        >
          Update Name
        </button>
        <p>Recovery code: {authState.code}</p>
        <button onClick={() => logOut.mutate()} disabled={logOut.isPending}>
          Log Out
        </button>
      </dialog>
    </>
  );
}
