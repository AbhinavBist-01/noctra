"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gear,
  UserCircle,
  SignOut,
  Trash,
  Warning,
  GoogleLogo,
  Shield,
  Info,
  Copy,
  Check,
} from "@phosphor-icons/react";
import { authClient } from "@/server/better-auth/auth-client";

type SessionUser = {
  email: string;
  name?: string;
  image?: string;
  id: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 220, damping: 20 },
  },
};

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ user: SessionUser } | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (res.data) setSession(res.data as any);
      setLoading(false);
    });
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await authClient.signOut();
      router.push("/signin");
    } catch {
      setSigningOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await (authClient as any).deleteUser();
      router.push("/signin");
    } catch {
      // Action may not be available yet
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const copyUserId = () => {
    if (session?.user?.id) {
      navigator.clipboard.writeText(session.user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const userInitial = session?.user?.name
    ? session.user.name.charAt(0).toUpperCase()
    : session?.user?.email
      ? session.user.email.charAt(0).toUpperCase()
      : "?";

  return (
    <div className="relative flex flex-1 flex-col gap-8 overflow-y-auto bg-[#020206] p-6 md:p-8 text-zinc-100 font-sans tracking-wide">
      {/* Background dot grid */}
      <div
        className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at center, #f59e0b 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col gap-8 w-full max-w-2xl"
      >
        {/* ─── Page Header ─── */}
        <motion.div variants={itemVariants} className="flex items-center gap-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
            <Gear size={22} weight="duotone" className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 font-display">
              Settings
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Manage your account, security, and preferences
            </p>
          </div>
        </motion.div>

        {/* ─── Account Info ─── */}
        <motion.div variants={itemVariants} className="flex flex-col gap-3">
          <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-600">
            Account
          </span>

          <div className="rounded-2xl border border-white/[0.04] bg-white/[0.015] p-6">
            {loading ? (
              <div className="flex items-center justify-center h-24 text-xs font-mono text-zinc-600">
                Loading account...
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* User profile row */}
                <div className="flex items-center gap-4">
                  {session?.user?.image && !avatarError ? (
                    <img
                      src={session.user.image}
                      alt="avatar"
                      onError={() => setAvatarError(true)}
                      className="h-12 w-12 rounded-xl border border-white/[0.06] object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-500 text-lg font-bold font-display">
                      {userInitial}
                    </div>
                  )}

                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-bold text-zinc-100 tracking-wide truncate">
                      {session?.user?.name ?? "Unnamed User"}
                    </span>
                    <span className="text-xs font-mono text-zinc-500 truncate">
                      {session?.user?.email ?? "—"}
                    </span>
                  </div>

                  {/* Google badge */}
                  <div className="ml-auto flex items-center gap-2 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-1.5">
                    <GoogleLogo
                      size={14}
                      weight="bold"
                      className="text-zinc-400"
                    />
                    <span className="text-[10px] font-mono font-bold text-zinc-500 tracking-wide">
                      Google
                    </span>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/[0.03] bg-white/[0.01] px-4 py-3">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-600 block mb-1">
                      Display Name
                    </span>
                    <span className="text-sm text-zinc-300 font-medium">
                      {session?.user?.name ?? "—"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-white/[0.03] bg-white/[0.01] px-4 py-3">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-600 block mb-1">
                      Email Address
                    </span>
                    <span className="text-sm text-zinc-300 font-medium truncate block">
                      {session?.user?.email ?? "—"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-white/[0.03] bg-white/[0.01] px-4 py-3 sm:col-span-2">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-600 block mb-1">
                      User ID
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 font-mono truncate">
                        {session?.user?.id ?? "—"}
                      </span>
                      {session?.user?.id && (
                        <button
                          onClick={copyUserId}
                          className="shrink-0 rounded-md border border-white/[0.04] bg-white/[0.02] p-1 text-zinc-500 hover:text-amber-500 hover:border-amber-500/20 transition-colors cursor-pointer"
                        >
                          {copiedId ? (
                            <Check size={12} weight="bold" />
                          ) : (
                            <Copy size={12} weight="bold" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Provider info */}
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.03] bg-white/[0.01] px-4 py-3">
                  <Shield
                    size={16}
                    weight="duotone"
                    className="text-emerald-500 shrink-0"
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-zinc-300">
                      Connected with Google
                    </span>
                    <span className="text-[10px] font-mono text-zinc-600">
                      OAuth 2.0 · Managed by your Google account
                    </span>
                  </div>
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-500/80">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    Active
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ─── Sign Out ─── */}
        <motion.div variants={itemVariants} className="flex flex-col gap-3">
          <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-600">
            Session
          </span>

          <div className="rounded-2xl border border-white/[0.04] bg-white/[0.015] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-red-500/10 bg-red-500/[0.06] p-2">
                  <SignOut
                    size={16}
                    weight="duotone"
                    className="text-red-400"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-zinc-200">
                    Sign Out
                  </span>
                  <span className="text-[11px] font-mono text-zinc-550">
                    End your current session and return to sign-in
                  </span>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex items-center gap-2 rounded-xl border border-red-500/15 bg-red-500/[0.06] hover:bg-red-500/[0.12] hover:border-red-500/25 px-5 py-2.5 text-xs font-mono font-bold text-red-400 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
              >
                <SignOut size={14} weight="bold" />
                <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* ─── Danger Zone — Delete Account ─── */}
        <motion.div variants={itemVariants} className="flex flex-col gap-3">
          <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-red-500/60">
            Danger Zone
          </span>

          <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.02] p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg border border-red-500/15 bg-red-500/[0.08] p-2 mt-0.5">
                <Warning
                  size={18}
                  weight="duotone"
                  className="text-red-400"
                />
              </div>

              <div className="flex flex-col gap-2 flex-1">
                <span className="text-sm font-bold text-zinc-200">
                  Delete Account
                </span>
                <p className="text-[11px] font-mono text-zinc-550 leading-relaxed max-w-md">
                  Permanently delete your Noctra account and all associated data
                  including emails, calendar data, and AI history. This action
                  cannot be undone.
                </p>

                <AnimatePresence mode="wait">
                  {!showDeleteConfirm ? (
                    <motion.div
                      key="trigger"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="mt-2"
                    >
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 rounded-xl border border-red-500/15 bg-red-500/[0.06] hover:bg-red-500/[0.12] hover:border-red-500/25 px-5 py-2.5 text-xs font-mono font-bold text-red-400 transition-all active:scale-95 cursor-pointer"
                      >
                        <Trash size={14} weight="bold" />
                        <span>Delete Account</span>
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                      className="mt-3 rounded-xl border border-red-500/15 bg-red-500/[0.04] p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Warning
                          size={14}
                          weight="fill"
                          className="text-red-400"
                        />
                        <span className="text-xs font-bold text-red-400">
                          Are you absolutely sure?
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-zinc-500 leading-relaxed mb-4">
                        This will permanently destroy your account and remove all
                        data from our servers. You will be signed out immediately.
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleting}
                          className="flex items-center gap-2 rounded-lg bg-red-500/90 hover:bg-red-500 px-4 py-2 text-xs font-mono font-bold text-white transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                        >
                          <Trash size={13} weight="bold" />
                          <span>
                            {deleting
                              ? "Deleting..."
                              : "Yes, delete my account"}
                          </span>
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2 text-xs font-mono font-bold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── App Info ─── */}
        <motion.div variants={itemVariants} className="flex flex-col gap-3">
          <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-600">
            About
          </span>

          <div className="rounded-2xl border border-white/[0.04] bg-white/[0.015] p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                <Info
                  size={16}
                  weight="duotone"
                  className="text-amber-500"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-zinc-200 font-display tracking-wide">
                  Noctra
                </span>
                <span className="text-[10px] font-mono text-zinc-600">
                  AI-powered productivity dashboard
                </span>
              </div>
              <span className="ml-auto rounded-lg border border-amber-500/15 bg-amber-500/[0.06] px-3 py-1 text-[10px] font-mono font-bold text-amber-500 tracking-wider">
                v1.0.0
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/[0.03] bg-white/[0.01] px-4 py-3">
                <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-600 block mb-1">
                  Version
                </span>
                <span className="text-xs text-zinc-400 font-mono">1.0.0</span>
              </div>
              <div className="rounded-xl border border-white/[0.03] bg-white/[0.01] px-4 py-3">
                <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-600 block mb-1">
                  Build
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  2026.06.18
                </span>
              </div>
              <div className="rounded-xl border border-white/[0.03] bg-white/[0.01] px-4 py-3">
                <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-600 block mb-1">
                  Runtime
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  Next.js 15
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4 pt-4 border-t border-white/[0.03]">
              <a
                href="#"
                className="text-[11px] font-mono font-bold text-zinc-500 hover:text-amber-500 transition-colors"
              >
                Documentation
              </a>
              <span className="h-3 w-px bg-white/[0.06]" />
              <a
                href="#"
                className="text-[11px] font-mono font-bold text-zinc-500 hover:text-amber-500 transition-colors"
              >
                Support
              </a>
              <span className="h-3 w-px bg-white/[0.06]" />
              <a
                href="#"
                className="text-[11px] font-mono font-bold text-zinc-500 hover:text-amber-500 transition-colors"
              >
                Changelog
              </a>
            </div>
          </div>
        </motion.div>

        {/* Bottom spacer */}
        <div className="h-8" />
      </motion.div>
    </div>
  );
}
