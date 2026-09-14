import { requiredConfig } from "@/lib/config";

/**
 * Runs once when the server starts, before it handles any request. Reading the
 * configuration here means a missing or incomplete `.env.local` stops the app at
 * startup and names the value it wants, instead of surfacing later as a failed
 * sign-in.
 */
export function register(): void {
  requiredConfig();
}
