import { useState } from "react";
import { useMaybeAuthState } from "../hooks/useMaybeAuthState";

export function Home() {
  return (
    <div>
      <h1>Barcelona Bingo</h1>
      <LoginOrSignUpForm />
    </div>
  );
}

function LoginOrSignUpForm() {
  const { logIn, signUp } = useMaybeAuthState();
  const [name, setName] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  return (
    <div>
      <div>
        <h2>Create a new account</h2>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={signUp.isPending}
        />
        <button disabled={signUp.isPending} onClick={() => signUp.mutate({ name })}>
          Sign Up
        </button>
      </div>
      <hr />
      <div>
        <h2>Or, use your recovery code</h2>
        <input
          type="text"
          placeholder="Recovery Code"
          value={recoveryCode}
          onChange={(e) => setRecoveryCode(e.target.value)}
        />
        <button onClick={() => logIn({ code: recoveryCode })}>Log In</button>
      </div>
    </div>
  );
}
