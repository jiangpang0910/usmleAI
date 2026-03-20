"use client";

/**
 * Client-side wrapper for the AuthProvider.
 *
 * Next.js App Router layout.tsx files are server components by default.
 * Since AuthProvider uses React hooks (useState, useEffect), it must
 * run on the client. This wrapper re-exports AuthProvider as a "use client"
 * component that can be safely used in the server-rendered root layout.
 */

import { AuthProvider } from "@/lib/auth";

export default AuthProvider;
