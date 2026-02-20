import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import QRCode from "qrcode";
import { QRCodeSVG } from "qrcode.react";
import { CaveAutocomplete, type Cave } from "@/components/CaveAutocomplete";
import { getQrRedirectUrl } from "@/lib/qr";
import { withAuth } from "@/lib/withAuth";

export const getServerSideProps = withAuth;

type CaveRef = { id: string; title: string } | null;

type PushpinRecord = {
  id: string;
  identifier: string;
  name: string;
};

type MapRecord = {
  id: string;
  pushpins: PushpinRecord[];
};

type QRCode = {
  id: string;
  slug: string;
  caves_id: string;
  cave: CaveRef;
  created_at: string;
  updated_at: string;
};

const PUSHPIN_QR_PREFIX = "speologieorg://qr/";

export default function QRListPage() {
  const router = useRouter();
  const [items, setItems] = useState<QRCode[]>([]);
  const [caveFilter, setCaveFilter] = useState<Cave | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pushpinModal, setPushpinModal] = useState<{
    slug: string;
    pushpins: PushpinRecord[];
  } | null>(null);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.reload();
  };

  useEffect(() => {
    const url = caveFilter
      ? `/api/qr?cave=${encodeURIComponent(caveFilter.id)}`
      : "/api/qr";
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setItems(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [caveFilter?.id]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this QR code?")) return;
    const res = await fetch(`/api/qr/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete");
    }
  };

  const handleRowClick = async (item: QRCode) => {
    const res = await fetch(`/api/qr/${item.id}/maps`);
    const maps: MapRecord[] = await res.json();
    const pushpins = maps.flatMap((m) => m.pushpins ?? []);
    setPushpinModal({ slug: item.slug, pushpins });
  };

  const handleDownload = async (qrUrl: string, slug: string) => {
    try {
      const size = 512;
      const logoSize = 128;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;

      await QRCode.toCanvas(canvas, qrUrl, {
        width: size,
        margin: 2,
        errorCorrectionLevel: "H",
      });

      const ctx = canvas.getContext("2d");
      if (ctx) {
        const logo = new Image();
        logo.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          logo.onload = () => {
            const x = (size - logoSize) / 2;
            const y = (size - logoSize) / 2;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(x, y, logoSize, logoSize);
            ctx.drawImage(logo, x, y, logoSize, logoSize);
            resolve();
          };
          logo.onerror = reject;
          logo.src = "/favicon-96x96.png";
        });
      }

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${slug.replace(/\//g, "-")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Failed to download");
    }
  };

  return (
    <div className="min-h-screen w-full bg-stone-100 px-4 py-8 dark:bg-stone-900">
      <div className="w-full">
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">
            Filter by cave
          </label>
          <div className="max-w-xs">
            <CaveAutocomplete
              value={caveFilter}
              onChange={setCaveFilter}
              placeholder="All caves"
              required={false}
            />
          </div>
        </div>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300"
            >
              ← Back
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-stone-800 dark:text-stone-100">
              QR Codes
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/qr/new"
              className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white transition-colors hover:bg-amber-700"
            >
              + New QR Code
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300"
            >
              Sign out
            </button>
          </div>
        </div>

        {loading && (
          <div className="rounded-lg border border-stone-200 bg-white p-8 text-center text-stone-500 dark:border-stone-700 dark:bg-stone-800">
            Loading...
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-lg border border-stone-200 bg-white p-12 text-center dark:border-stone-700 dark:bg-stone-800">
            <p className="text-stone-500 dark:text-stone-400">
              No QR codes yet. Create your first one.
            </p>
            <Link
              href="/qr/new"
              className="mt-4 inline-block text-amber-600 hover:text-amber-700 dark:text-amber-500"
            >
              Create QR Code →
            </Link>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="space-y-3">
            {items.map((item) => {
              const qrUrl = getQrRedirectUrl(item.slug);
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleRowClick(item)}
                  onKeyDown={(e) => e.key === "Enter" && handleRowClick(item)}
                  className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-stone-200 bg-white p-4 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 rounded border border-stone-200 bg-white p-4 dark:border-stone-600">
                      <QRCodeSVG
                        value={qrUrl}
                        size={128}
                        level="H"
                        imageSettings={{
                          src: "/favicon-96x96.png",
                          height: 40,
                          width: 40,
                          excavate: true,
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium text-stone-800 dark:text-stone-100">
                        {item.slug}
                      </p>
                      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                        Cave: {item.cave?.title ?? item.caves_id}
                      </p>
                    </div>
                  </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDownload(qrUrl, item.slug)}
                    className="rounded px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-700"
                  >
                    Download
                  </button>
                  <Link
                    href={`/qr/${item.id}/edit`}
                    className="rounded px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-950"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="rounded px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-950"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
            })}
          </div>
        )}

        {pushpinModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setPushpinModal(null)}
          >
            <div
              className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">
                  Pushpin QR Codes – {pushpinModal.slug}
                </h2>
                <button
                  type="button"
                  onClick={() => setPushpinModal(null)}
                  className="rounded px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-700"
                >
                  Close
                </button>
              </div>
              {pushpinModal.pushpins.length === 0 ? (
                <p className="text-center text-stone-500 dark:text-stone-400">
                  No pushpins yet. Add maps and pushpins in the edit screen.
                </p>
              ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {pushpinModal.pushpins.map((pin) => {
                  const url = `${PUSHPIN_QR_PREFIX}${pin.identifier}`;
                  return (
                    <div
                      key={pin.id}
                      className="flex flex-col items-center rounded-lg border border-stone-200 p-3 dark:border-stone-600"
                    >
                      <QRCodeSVG
                        value={url}
                        size={120}
                        level="H"
                        imageSettings={{
                          src: "/favicon-96x96.png",
                          height: 32,
                          width: 32,
                          excavate: true,
                        }}
                      />
                      <p className="mt-2 truncate text-center text-xs font-medium text-stone-700 dark:text-stone-300">
                        {pin.name || pin.identifier}
                      </p>
                      <p className="mt-0.5 truncate text-center text-xs text-stone-500 dark:text-stone-400">
                        {pin.identifier}
                      </p>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
