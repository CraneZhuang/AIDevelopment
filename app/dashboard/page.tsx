import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await currentSession();
  if (!session) redirect("/login");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Signed in as {session.account}</h1>
    </main>
  );
}
