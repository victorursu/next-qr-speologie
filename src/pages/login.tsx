import { useState } from "react";
import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Login failed");
      setLoading(false);
      return;
    }

    window.location.href = "/qr";
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-transparent px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-stone-800 dark:text-stone-100">
          QR Deeplinking into Speologie.org mobile app
        </h1>
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800"
        >
          {error && (
            <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
            autoFocus
            className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-sky-600 px-4 py-2 font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
