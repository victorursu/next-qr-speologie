import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { CaveAutocomplete, type Cave } from "@/components/CaveAutocomplete";
import { withAuth } from "@/lib/withAuth";

export const getServerSideProps = withAuth;

export default function NewQRPage() {
  const router = useRouter();
  const [cave, setCave] = useState<Cave | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingQrId, setExistingQrId] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  useEffect(() => {
    if (!cave) {
      setExistingQrId(null);
      return;
    }
    let cancelled = false;
    setCheckingExisting(true);
    setExistingQrId(null);
    fetch(`/api/qr?cave=${encodeURIComponent(String(cave.id))}`)
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled) return;
        const arr = Array.isArray(data) ? data : [];
        const first = arr[0] as { id?: string } | undefined;
        setExistingQrId(first?.id != null ? String(first.id) : null);
      })
      .catch(() => {
        if (!cancelled) setExistingQrId(null);
      })
      .finally(() => {
        if (!cancelled) setCheckingExisting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cave?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cave || existingQrId) return;

    setLoading(true);
    setError(null);

    const res = await fetch("/api/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caves_id: cave.id }),
    });

    const data = (await res.json()) as {
      error?: string;
      existing_id?: string;
    };

    if (!res.ok) {
      if (res.status === 409 && data.existing_id) {
        setExistingQrId(data.existing_id);
      }
      setError(data.error || "Failed to create");
      setLoading(false);
      return;
    }

    router.push("/qr");
  };

  return (
    <div className="min-h-screen bg-transparent px-4 py-8">
      <div className="mx-auto max-w-md">
        <Link
          href="/qr"
          className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300"
        >
          ← Back to list
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-stone-800 dark:text-stone-100">
          Create QR Code
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Slug is auto-generated. Select a cave (search ignores diacritics). Each
          cave can only have one QR—if one already exists, edit it from the list
          instead of creating another.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-800"
        >
          {error && (
            <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Cave
          </label>
          <div className="mt-2">
            <CaveAutocomplete
              value={cave}
              onChange={setCave}
              placeholder="Type to search caves (e.g. Petera Movile)"
              required
            />
          </div>

          {cave && checkingExisting && (
            <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
              Checking for an existing QR for this cave…
            </p>
          )}

          {cave && !checkingExisting && existingQrId && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-medium">This cave already has a QR code</p>
              <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
                You cannot create a second QR for the same cave. Open the list,
                find this cave’s QR, and edit it there—or use the link below.
              </p>
              <Link
                href={`/qr/${existingQrId}/edit`}
                className="mt-3 inline-block font-medium text-amber-900 underline decoration-amber-700/60 underline-offset-2 hover:text-amber-950 dark:text-amber-100 dark:hover:text-white"
              >
                Edit existing QR →
              </Link>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={loading || !cave || !!existingQrId || checkingExisting}
              className="flex-1 rounded-lg bg-sky-600 px-4 py-2 font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create"}
            </button>
            <Link
              href="/qr"
              className="rounded-lg border border-stone-300 px-4 py-2 font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
