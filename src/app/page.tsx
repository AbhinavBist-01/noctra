import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/server/better-auth/auth";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <span className="text-lg font-semibold text-zinc-300">Noctra</span>
        <div className="flex items-center gap-3">
          <Link
            href="/signin"
            className="rounded-lg px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
            Your command desk for email & calendar
          </h1>
          <p className="mt-4 text-lg text-zinc-400">
            Manage Gmail and Google Calendar with natural language commands.
            Draft, send, schedule — all from one place.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center rounded-lg bg-zinc-100 px-6 py-3 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
          >
            Get Started
          </Link>
        </div>
      </main>
    </div>
  );
}
