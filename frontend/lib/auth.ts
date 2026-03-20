"use client";

/**
 * Authentication context and provider for Google OAuth login state.
 *
 * Manages the user's authentication lifecycle:
 * - Extracts JWT token from URL after OAuth callback redirect
 * - Fetches user profile from /api/auth/me on mount
 * - Provides login/logout functions and user state to all components
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  createElement,
} from "react";
import type { ReactNode } from "react";
import type { AuthUser } from "./types";
import { API_BASE_URL, apiFetch } from "./api";

/**
 * Shape of the authentication context value.
 * All components wrapped in AuthProvider can access these via useAuth().
 */
interface AuthContextType {
  /** The currently authenticated user, or null if not logged in */
  user: AuthUser | null;
  /** Whether the initial auth check is still in progress */
  loading: boolean;
  /** Redirect the browser to Google OAuth consent screen */
  login: () => void;
  /** Clear the stored token and reset to anonymous state */
  logout: () => void;
}

/**
 * React context for authentication state.
 * Initialized as undefined so useAuth() can detect missing provider.
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication provider component.
 *
 * Wraps the app to provide auth state to all child components.
 * On mount:
 * 1. Checks URL for ?token= parameter (from OAuth callback redirect)
 * 2. If token found, stores it in localStorage and cleans the URL
 * 3. If localStorage has a token, fetches user profile from /api/auth/me
 * 4. Sets loading=false when the initial auth check completes
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Current authenticated user (null = not logged in)
  const [user, setUser] = useState<AuthUser | null>(null);

  // Loading flag prevents flash of unauthenticated UI during initial check
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /**
     * Initialize authentication state on mount.
     * Extracts token from URL if present, then validates stored token.
     */
    async function initAuth() {
      // Check URL for ?token= parameter from OAuth callback redirect
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("token");

      if (urlToken) {
        // Store the JWT token from the OAuth redirect
        localStorage.setItem("usmleai_token", urlToken);

        // Remove the ?token= parameter from the URL without reloading the page
        // This keeps the URL clean after login
        params.delete("token");
        const cleanUrl =
          window.location.pathname +
          (params.toString() ? `?${params.toString()}` : "");
        window.history.replaceState({}, "", cleanUrl);
      }

      // Check if we have a stored token (either from URL or previous session)
      const token = localStorage.getItem("usmleai_token");
      if (token) {
        try {
          // Validate the token by fetching the user profile
          const profile = await apiFetch<AuthUser>("/api/auth/me");
          setUser(profile);
        } catch {
          // Token is invalid or expired -- clear it and stay anonymous
          localStorage.removeItem("usmleai_token");
        }
      }

      // Auth check complete -- safe to render the UI
      setLoading(false);
    }

    initAuth();
  }, []);

  /**
   * Redirect the browser to the Google OAuth consent screen.
   * The backend /api/auth/google/login endpoint handles the OAuth flow
   * and redirects back to the frontend with a JWT token.
   */
  const login = useCallback(() => {
    window.location.href = `${API_BASE_URL}/api/auth/google/login`;
  }, []);

  /**
   * Log out the current user by clearing the stored JWT token.
   * Since JWT auth is stateless, no server-side action is needed.
   */
  const logout = useCallback(() => {
    localStorage.removeItem("usmleai_token");
    setUser(null);
  }, []);

  // Provide auth state and actions to all child components
  return createElement(
    AuthContext.Provider,
    { value: { user, loading, login, logout } },
    children
  );
}

/**
 * Hook to access authentication state and actions.
 *
 * Must be used within an AuthProvider. Returns the current user,
 * loading state, and login/logout functions.
 *
 * @throws Error if used outside of an AuthProvider
 * @returns AuthContextType with user, loading, login, and logout
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
