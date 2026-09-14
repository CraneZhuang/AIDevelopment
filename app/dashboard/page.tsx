import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { signOutAction } from "./actions";

export default async function DashboardPage() {
  const session = await currentSession();
  if (!session) redirect("/login");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Signed in as {session.account}</h1>
      <form action={signOutAction}>
        <button type="submit" className="w-full rounded bg-gray-900 px-3 py-2 text-white">
          Sign out
        </button>
      </form>
    </main>
  );
}
