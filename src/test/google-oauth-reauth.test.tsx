import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- Mocks ---------------------------------------------------------------

const signInWithOAuthMock = vi.fn();
const signOutMock = vi.fn();

vi.mock("@/integrations/lovable/index", () => ({
  lovable: {
    auth: {
      signInWithOAuth: (...args: unknown[]) => signInWithOAuthMock(...args),
    },
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signOut: (...args: unknown[]) => signOutMock(...args),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: async () => ({ data: { session: null } }),
    },
  },
}));

vi.mock("@/components/Navbar", () => ({ default: () => <nav data-testid="navbar" /> }));
vi.mock("@/components/SEO", () => ({ default: () => null }));
vi.mock("@/context/I18nContext", () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Imports AFTER mocks
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { AuthProvider, useAuth } from "@/context/AuthContext";

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  signInWithOAuthMock.mockReset();
  signInWithOAuthMock.mockResolvedValue({ redirected: true });
  signOutMock.mockReset();
  signOutMock.mockResolvedValue({ error: null });
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

// --- Tests ---------------------------------------------------------------

describe("Google OAuth re-auth — account picker is always shown", () => {
  it("Login page passes prompt='select_account' to Google OAuth", async () => {
    renderWithProviders(<Login />);

    fireEvent.click(screen.getByRole("button", { name: /loginWithGoogle/i }));

    await waitFor(() => expect(signInWithOAuthMock).toHaveBeenCalledTimes(1));
    const [provider, opts] = signInWithOAuthMock.mock.calls[0];
    expect(provider).toBe("google");
    expect(opts?.extraParams?.prompt).toBe("select_account");
  });

  it("Register page passes prompt='select_account' to Google OAuth", async () => {
    renderWithProviders(<Register />);

    fireEvent.click(screen.getByRole("button", { name: /signUpWithGoogle/i }));

    await waitFor(() => expect(signInWithOAuthMock).toHaveBeenCalledTimes(1));
    const [provider, opts] = signInWithOAuthMock.mock.calls[0];
    expect(provider).toBe("google");
    expect(opts?.extraParams?.prompt).toBe("select_account");
  });
});

describe("signOut purges auth storage so next Google login is fresh", () => {
  // Helper component to expose signOut
  const SignOutHarness = () => {
    const { signOut } = useAuth();
    return (
      <button onClick={() => void signOut()} data-testid="signout-btn">
        sign out
      </button>
    );
  };

  it("removes sb-*, supabase.*, lovable auth, and oauth keys from localStorage and sessionStorage", async () => {
    // Seed storage with keys that simulate a previous Google session
    localStorage.setItem("sb-xyz-auth-token", "abc");
    localStorage.setItem("supabase.auth.token", "abc");
    localStorage.setItem("lovable.auth.session", "abc");
    localStorage.setItem("oauth-state", "abc");
    localStorage.setItem("user-preference-theme", "dark"); // unrelated, must remain

    sessionStorage.setItem("sb-session-temp", "abc");
    sessionStorage.setItem("oauth-pkce-verifier", "abc");
    sessionStorage.setItem("language", "id"); // unrelated

    renderWithProviders(<SignOutHarness />);
    fireEvent.click(screen.getByTestId("signout-btn"));

    await waitFor(() => expect(signOutMock).toHaveBeenCalled());

    // Auth-related keys must be gone
    expect(localStorage.getItem("sb-xyz-auth-token")).toBeNull();
    expect(localStorage.getItem("supabase.auth.token")).toBeNull();
    expect(localStorage.getItem("lovable.auth.session")).toBeNull();
    expect(localStorage.getItem("oauth-state")).toBeNull();
    expect(sessionStorage.getItem("sb-session-temp")).toBeNull();
    expect(sessionStorage.getItem("oauth-pkce-verifier")).toBeNull();

    // Unrelated keys must be preserved
    expect(localStorage.getItem("user-preference-theme")).toBe("dark");
    expect(sessionStorage.getItem("language")).toBe("id");
  });

  it("calls supabase signOut with global scope to revoke all sessions", async () => {
    renderWithProviders(<SignOutHarness />);
    fireEvent.click(screen.getByTestId("signout-btn"));

    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    expect(signOutMock).toHaveBeenCalledWith({ scope: "global" });
  });

  it("after logout, the next Google login still requests the account picker", async () => {
    // Simulate a stale prior session
    localStorage.setItem("sb-xyz-auth-token", "stale");

    const { unmount } = renderWithProviders(<SignOutHarness />);
    fireEvent.click(screen.getByTestId("signout-btn"));
    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    expect(localStorage.getItem("sb-xyz-auth-token")).toBeNull();
    unmount();

    // Now user navigates to Login and clicks Google again
    renderWithProviders(<Login />);
    fireEvent.click(screen.getByRole("button", { name: /loginWithGoogle/i }));

    await waitFor(() => expect(signInWithOAuthMock).toHaveBeenCalled());
    const [, opts] = signInWithOAuthMock.mock.calls[0];
    expect(opts?.extraParams?.prompt).toBe("select_account");
  });
});
