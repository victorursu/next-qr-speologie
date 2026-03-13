import { useState } from "react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cave) return;

    setLoading(true);
    setError(null);

    const res = await fetch("/api/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caves_id: cave.id }),
    });

    const data = await res.json();

    if (!res.ok) {
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
          Slug is auto-generated. Select a cave (search ignores diacritics).
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

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={loading || !cave}
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
