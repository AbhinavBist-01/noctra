"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/server/better-auth/auth-client";

// Custom Bat-winged backlit NOCTRA Logo SVG
function NoctraLogo({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center gap-2 select-none group/logo ${className}`}>
      {/* Backlit Golden-Amber Glow */}
      <div className="absolute -inset-2 rounded-lg bg-amber-500/10 blur-md opacity-60 pointer-events-none" />
      <svg
        viewBox="0 0 170 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative h-full w-auto text-amber-500 fill-current drop-shadow-[0_0_8px_rgba(245,158,11,0.4)] transition-all duration-300"
      >
        {/* Bat Wing 'N' */}
        <path
          d="M 28 8 
             C 20 9, 14 12, 6 15 
             C 10 18, 11 21, 10 25 
             C 14 24, 18 25, 21 28 
             C 22 24, 25 22, 28 21 
             C 27 26, 27 29, 28 32
             L 34 32
             L 34 8 
             Z"
          fill="currentColor"
        />
        {/* Diagonal & Right Vertical leg of 'N' */}
        <path
          d="M 34 8 L 47 32 L 53 32 L 53 8 L 47 8 L 47 25 L 34 8 Z"
          fill="currentColor"
        />
        {/* O */}
        <path
          d="M 69 8 C 61.8 8, 56 13.4, 56 20 C 56 26.6, 61.8 32, 69 32 C 76.2 32, 82 26.6, 82 20 C 82 13.4, 76.2 8, 69 8 Z M 69 13.5 C 73 13.5, 76 16.2, 76 20 C 76 23.8, 73 26.5, 69 26.5 C 65 26.5, 62 23.8, 62 20 C 62 16.2, 65 13.5, 69 13.5 Z"
          fill="currentColor"
        />
        {/* C */}
        <path
          d="M 97 13.5 L 97 8 C 89.8 8, 85 13.4, 85 20 C 85 26.6, 89.8 32, 97 32 L 97 26.5 C 93 26.5, 91 23.8, 91 20 C 91 16.2, 93 13.5, 97 13.5 Z"
          fill="currentColor"
        />
        {/* T */}
        <path
          d="M 100 8 L 100 13.5 L 106 13.5 L 106 32 L 112 32 L 112 13.5 L 118 13.5 L 118 8 Z"
          fill="currentColor"
        />
        {/* R */}
        <path
          d="M 122 8 L 122 32 L 128 32 L 128 22.5 L 133 32 L 140 32 L 133.5 21 C 137.5 19.5, 139 16.5, 139 13.5 C 139 10, 136 8, 129 8 L 122 8 Z M 128 13.5 L 129.5 13.5 C 132 13.5, 133 14.5, 133 15.7 C 133 17, 132 18, 129.5 18 L 128 18 L 128 13.5 Z"
          fill="currentColor"
        />
        {/* A */}
        <path
          d="M 149 8 L 142 32 L 148 32 L 150 25 L 157 25 L 159 32 L 165 32 L 158 8 L 149 8 Z M 151.5 20 L 153.5 13.5 L 155.5 20 L 151.5 20 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

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
    router.push("/dashboard");
  };

  const handleGoogleAuth = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}/dashboard`,
    });
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/[0.04] bg-zinc-950/60 backdrop-blur-xl p-8 sm:p-10 shadow-2xl shadow-black relative z-10 flex flex-col gap-6">
      
      {/* Brand logo at the top */}
      <div className="flex flex-col items-center gap-3">
        <NoctraLogo className="h-9" />
        <div className="text-center mt-2">
          <h2 className="text-lg font-bold text-zinc-100">Sign in</h2>
          <p className="text-xs font-mono text-zinc-500 mt-1">Welcome back to the command desk</p>
        </div>
      </div>

      {/* Social Google Auth */}
      <button
        onClick={handleGoogleAuth}
        className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] px-4 py-3 text-xs font-mono font-bold text-zinc-300 transition-all duration-300 hover:scale-[1.01]"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span>Continue with Google</span>
      </button>

      {/* Or Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <span className="text-[10px] font-mono text-zinc-600 uppercase">or</span>
        <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Credentials form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Email Field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Email address</label>
          <input
            type="email"
            required
            placeholder="you@corp.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-200 outline-none focus:border-amber-500/40 w-full placeholder:text-zinc-700 transition-colors"
          />
        </div>

        {/* Password Field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Password</label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-200 outline-none focus:border-amber-500/40 w-full placeholder:text-zinc-700 transition-colors"
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-red-500/10 bg-red-950/20 px-4 py-2.5 text-xs font-mono text-red-400">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold px-4 py-3 text-xs font-mono transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/15 hover:scale-[1.01] disabled:opacity-40"
        >
          {loading ? "Signing in..." : "Sign In with Credentials"}
        </button>
      </form>

      {/* Redirect Link */}
      <div className="text-center text-xs font-mono text-zinc-500 mt-2">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-amber-500 hover:text-amber-400 underline underline-offset-4"
        >
          Sign up
        </Link>
      </div>

    </div>
  );
}
