import { useMaybeAuthState } from "./hooks/useMaybeAuthState";
import { Dashboard } from "./pages/Dashboard/Dashboard";
import { Home } from "./pages/Home";

export function App() {
  const { authState } = useMaybeAuthState();

  if (authState) {
    return <Dashboard />;
  }
  return <Home />;
}
