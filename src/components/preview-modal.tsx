"use client";

import type { CommandPreviewAction } from "@/shared/command";

type Props = {
  actions: CommandPreviewAction[];
  onActionsChange: (actions: CommandPreviewAction[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
};

const formatDate = (iso?: string) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
};

const isEmailAction = (a: CommandPreviewAction): a is CommandPreviewAction & { type: "email_draft" | "email_send" } =>
  a.type === "email_draft" || a.type === "email_send";

export function PreviewModal({ actions, onActionsChange, onConfirm, onCancel, loading }: Props) {
  if (actions.length === 0) return null;

  const toggleMode = (id: string) => {
    onActionsChange(
      actions.map((a) =>
        a.id === id && isEmailAction(a)
          ? { ...a, type: a.type === "email_draft" ? "email_send" : "email_draft" }
          : a,
      ),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <div className="text-base font-semibold text-zinc-100">
          Preview Actions
        </div>
        <div className="mt-3 space-y-3">
          {actions.map((action) => (
            <div
              key={action.id}
              className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {action.type === "email_draft"
                    ? "📝 Draft Email"
                    : action.type === "email_send"
                      ? "📨 Send Email"
                      : "📅 Calendar Invite"}
                </div>
                {isEmailAction(action) && (
                  <button
                    onClick={() => toggleMode(action.id)}
                    className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                      action.type === "email_draft"
                        ? "bg-amber-900/50 text-amber-400 hover:bg-amber-800/50"
                        : "bg-emerald-900/50 text-emerald-400 hover:bg-emerald-800/50"
                    }`}
                  >
                    {action.type === "email_draft" ? "Draft" : "Send"}
                  </button>
                )}
              </div>
              {action.type !== "calendar_invite" && (
                <>
                  <div className="mt-1 text-sm text-zinc-100">
                    To: {action.to?.join(", ")}
                  </div>
                  <div className="text-sm text-zinc-300">
                    Subject: {action.subject}
                  </div>
                  <div className="line-clamp-2 text-xs text-zinc-400">
                    {action.body}
                  </div>
                </>
              )}
              {action.type === "calendar_invite" && (
                <>
                  <div className="mt-1 text-sm text-zinc-100">
                    {action.title}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {action.start && formatDate(action.start)} —{" "}
                    {action.end && formatDate(action.end)}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {action.attendees?.map((a) => a.email).join(", ")}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-40"
          >
            {loading ? "Executing..." : "Confirm & Execute"}
          </button>
        </div>
      </div>
    </div>
  );
}
