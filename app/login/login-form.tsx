"use client";

import { useActionState } from "react";
import { signInAction } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(signInAction, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="account">Account</label>
        <input
          id="account"
          name="account"
          autoComplete="username"
          required
          className="rounded border border-gray-300 bg-white px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded border border-gray-300 bg-white px-3 py-2"
        />
      </div>

      {state && (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-gray-900 px-3 py-2 text-white disabled:opacity-60"
      >
        Sign in
      </button>
    </form>
  );
}
