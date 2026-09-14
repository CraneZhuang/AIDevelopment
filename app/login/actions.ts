"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

/** What the sign-in form shows after a submission: a refusal, or nothing. */
export type SignInState = { message: string } | null;

const REFUSAL = "Incorrect account or password.";

export async function signInAction(_state: SignInState, formData: FormData): Promise<SignInState> {
  const account = String(formData.get("account") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!(await signIn(account, password))) {
    return { message: REFUSAL };
  }

  redirect("/dashboard");
}
