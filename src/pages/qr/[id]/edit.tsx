import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { CaveAutocomplete, type Cave } from "@/components/CaveAutocomplete";
import { MapPushpinModal, type Pushpin } from "@/components/MapPushpinModal";
import { withAuth } from "@/lib/withAuth";

export const getServerSideProps = withAuth;

type CaveRef = { id: string; title: string } | null;

type PushpinRecord = {
  id: string;
  identifier: string;
  x: number;
  y: number;
  name: string;
  html: string;
};

type MapRecord = {
  id: string;
  s3_key: string;
  filename: string | null;
  url: string;
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

export default function EditQRPage() {
  const router = useRouter();
  const { id } = router.query;

  const [slug, setSlug] = useState("");
  const [cave, setCave] = useState<Cave | null>(null);
  const [maps, setMaps] = useState<MapRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalMap, setModalMap] = useState<MapRecord | null>(null);
  const [pushpinEdits, setPushpinEdits] = useState<Record<string, { name: string; html: string }>>({});

  const fetchMaps = useCallback(() => {
    if (typeof id !== "string") return;
    fetch(`/api/qr/${id}/maps`)
      .then((res) => res.json())
      .then((data: MapRecord[] | { error: string }) => {
        if (Array.isArray(data)) {
          setMaps(data);
          const edits: Record<string, { name: string; html: string }> = {};
          data.forEach((m) =>
            m.pushpins?.forEach((p) => {
              edits[p.id] = { name: p.name, html: p.html ?? "" };
            })
          );
          setPushpinEdits(edits);
        }
      })
      .catch(console.error);
  }, [id]);

  useEffect(() => {
    if (typeof id !== "string") return;

    Promise.all([
      fetch(`/api/qr/${id}`),
      fetch(`/api/qr/${id}/maps`),
    ])
      .then(([qrRes, mapsRes]) =>
        Promise.all([qrRes.json(), mapsRes.json()])
      )
      .then(([qrData, mapsData]) => {
        if ("error" in qrData) {
          setError(qrData.error);
        } else {
          setSlug(qrData.slug);
          setCave(qrData.cave ? { id: qrData.cave.id, title: qrData.cave.title } : null);
        }
        if (Array.isArray(mapsData)) {
          setMaps(mapsData);
          const edits: Record<string, { name: string; html: string }> = {};
          mapsData.forEach((m: MapRecord) =>
            m.pushpins?.forEach((p: PushpinRecord) => {
              edits[p.id] = { name: p.name, html: p.html ?? "" };
            })
          );
          setPushpinEdits(edits);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setFetchLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof id !== "string" || !cave) return;

    setLoading(true);
    setError(null);

    const res = await fetch(`/api/qr/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, caves_id: cave.id }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to update");
      setLoading(false);
      return;
    }

    router.push("/qr");
  };

  const handleMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || typeof id !== "string") return;

    setUploading(true);
    setError(null);

    try {
      const uploadUrlRes = await fetch(`/api/qr/${id}/maps/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });
      const uploadUrlData = await uploadUrlRes.json();
      if (!uploadUrlRes.ok) {
        throw new Error(uploadUrlData.error || "Failed to get upload URL");
      }
      const { uploadUrl, s3Key } = uploadUrlData;

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      await fetch(`/api/qr/${id}/maps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ s3Key, filename: file.name }),
      });

      fetchMaps();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSavePushpins = async (mapId: string, pushpins: Pushpin[]) => {
    const res = await fetch(`/api/maps/${mapId}/pushpins`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pushpins: pushpins.map((p) => ({
          identifier: p.identifier,
          x: p.x,
          y: p.y,
          name: p.name,
        })),
      }),
    });
    if (!res.ok) throw new Error("Failed to save pushpins");
    fetchMaps();
    setModalMap(null);
  };

  const handlePushpinChange = (pushpinId: string, field: "name" | "html", value: string) => {
    setPushpinEdits((prev) => ({
      ...prev,
      [pushpinId]: {
        ...prev[pushpinId],
        [field]: value,
      },
    }));
  };

  const handlePushpinSave = async (pushpinId: string) => {
    const edit = pushpinEdits[pushpinId];
    if (!edit) return;

    const res = await fetch(`/api/pushpins/${pushpinId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: edit.name, html: edit.html }),
    });
    if (!res.ok) {
      setError("Failed to update pushpin");
      return;
    }
    fetchMaps();
  };

  if (fetchLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 dark:bg-stone-900">
        <p className="text-stone-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 px-4 py-8 dark:bg-stone-900">
      <div className="w-full">
        <Link
          href="/qr"
          className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300"
        >
          ← Back to list
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-stone-800 dark:text-stone-100">
          Edit QR Code
        </h1>

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
            Slug
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="speologie/qr/abc123"
            required
            className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-2 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
          />

          <label className="mt-4 block text-sm font-medium text-stone-700 dark:text-stone-300">
            Cave
          </label>
          <div className="mt-2">
            <CaveAutocomplete
              value={cave}
              onChange={setCave}
              placeholder="Type to search caves"
              required
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Maps
            </label>
            <div className="mt-2 flex flex-wrap gap-4">
              {maps.map((map) => (
                <div
                  key={map.id}
                  className="group relative cursor-pointer"
                  onClick={() => setModalMap(map)}
                >
                  <div className="h-24 w-24 overflow-hidden rounded border border-stone-200 bg-stone-100 dark:border-stone-600 dark:bg-stone-700">
                    {map.url ? (
                      <img
                        src={map.url}
                        alt={map.filename || "Map"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-stone-400">
                        Map
                      </div>
                    )}
                  </div>
                  <span className="mt-1 block max-w-[6rem] truncate text-xs text-stone-500">
                    {map.filename || "Map"}
                  </span>
                </div>
              ))}
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-stone-300 text-stone-500 hover:border-amber-500 hover:text-amber-600 dark:border-stone-600 dark:hover:border-amber-500">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleMapUpload}
                  disabled={uploading}
                />
                {uploading ? "..." : "+ Upload"}
              </label>
            </div>
          </div>

          {maps.some((m) => m.pushpins?.length) ? (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300">
                Pushpins
              </h3>
              <div className="mt-2 space-y-4">
                {maps.map((map) =>
                  map.pushpins?.map((pin) => (
                    <div
                      key={pin.id}
                      className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800"
                    >
                      <div className="mb-2 text-xs text-stone-500">
                        {map.filename || "Map"} • {pin.identifier}
                      </div>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={pushpinEdits[pin.id]?.name ?? pin.name}
                          onChange={(e) =>
                            handlePushpinChange(pin.id, "name", e.target.value)
                          }
                          placeholder="Name"
                          className="w-full rounded border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
                        />
                        <textarea
                          value={pushpinEdits[pin.id]?.html ?? pin.html ?? ""}
                          onChange={(e) =>
                            handlePushpinChange(pin.id, "html", e.target.value)
                          }
                          placeholder="HTML content"
                          rows={3}
                          className="w-full rounded border border-stone-300 px-3 py-2 text-sm font-mono dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
                        />
                        <button
                          type="button"
                          onClick={() => handlePushpinSave(pin.id)}
                          className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
                        >
                          Save pushpin
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={loading || !cave}
              className="flex-1 rounded-lg bg-amber-600 px-4 py-2 font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
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

      {modalMap && (
        <MapPushpinModal
          map={{
            id: modalMap.id,
            url: modalMap.url,
            filename: modalMap.filename ?? undefined,
          }}
          pushpins={modalMap.pushpins?.map((p) => ({
            identifier: p.identifier,
            x: Number(p.x),
            y: Number(p.y),
            name: p.name,
            html: p.html,
          })) ?? []}
          onSave={(pushpins) => handleSavePushpins(modalMap.id, pushpins)}
          onClose={() => setModalMap(null)}
        />
      )}
    </div>
  );
}
