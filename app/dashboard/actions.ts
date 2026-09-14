"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";

/** Ends the session and returns the visitor to the sign-in form. */
export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/login");
}
