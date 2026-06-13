"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/server/better-auth/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await authClient.signIn.email({ email, password });
    setLoading(false);

    if (err) {
      setError(err.message ?? err.statusText ?? "Sign in failed");
      return;
    }
    router.push("/");
  };

  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-8 shadow-2xl">
        <div className="text-center">
          <div className="text-lg font-semibold text-zinc-100">Sign in</div>
          <div className="mt-1 text-sm text-zinc-400">Welcome back to Noctra</div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-zinc-600"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-zinc-600"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-40"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-zinc-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-zinc-300 underline underline-offset-2 hover:text-zinc-100">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
