import { useState, useRef, useCallback, useEffect } from "react";
import { nanoid } from "nanoid";
import { PushpinHtmlEditor } from "@/components/PushpinHtmlEditor";
import { CollapsiblePushpinContent } from "@/components/CollapsiblePushpinContent";

export type Pushpin = {
  id?: string;
  identifier: string;
  x: number;
  y: number;
  name: string;
  html?: string;
};

type MapPushpinModalProps = {
  map: { id: string; url: string; filename?: string };
  pushpins: Pushpin[];
  onSave: (pushpins: Pushpin[]) => Promise<void>;
  onClose: () => void;
};

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

export function MapPushpinModal({
  map,
  pushpins: initialPushpins,
  onSave,
  onClose,
}: MapPushpinModalProps) {
  const [pushpins, setPushpins] = useState<Pushpin[]>(initialPushpins);
  const [saving, setSaving] = useState(false);
  const [addingName, setAddingName] = useState("");
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const handleMapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const img = imgRef.current;
      if (!img) return;
      const rect = img.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        setPendingPoint({ x, y });
        setAddingName("");
      }
    },
    []
  );

  const handleImgLoad = useCallback(() => {
    const img = imgRef.current;
    if (img) {
      setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
    }
  }, []);

  useEffect(() => {
    if (!imgSize.width || !imgSize.height) return;
    const container = mapContainerRef.current;
    if (!container) return;

    const updateZoom = () => {
      const containerW = container.clientWidth;
      const containerH = container.clientHeight;
      if (!containerW || !containerH) return;
      const fitScale = Math.min(
        containerW / imgSize.width,
        containerH / imgSize.height
      );
      setZoom((z) => {
        if (z === 1) return Math.min(1, Math.max(ZOOM_MIN, fitScale));
        return z;
      });
    };

    requestAnimationFrame(updateZoom);
  }, [imgSize.width, imgSize.height]);

  const handleConfirmAdd = useCallback(() => {
    if (!pendingPoint || !addingName.trim()) return;
    const newPin: Pushpin = {
      identifier: nanoid(10),
      x: pendingPoint.x,
      y: pendingPoint.y,
      name: addingName.trim(),
      html: "<p></p>",
    };
    setPushpins((prev) => [...prev, newPin]);
    setPendingPoint(null);
    setAddingName("");
  }, [pendingPoint, addingName]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(pushpins);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (identifier: string) => {
    setPushpins((prev) => prev.filter((p) => p.identifier !== identifier));
  };

  const updatePin = useCallback((identifier: string, patch: Partial<Pushpin>) => {
    setPushpins((prev) =>
      prev.map((p) => (p.identifier === identifier ? { ...p, ...patch } : p))
    );
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-auto rounded-lg border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-800">
          <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">
            {map.filename || "Map"} – Add pushpins
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-2 flex items-center justify-between gap-4">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Click on the map to add a pushpin, then enter a name.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-stone-500 dark:text-stone-400">
                Zoom
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
                disabled={zoom <= ZOOM_MIN}
                className="flex h-8 w-8 items-center justify-center rounded border border-stone-300 text-lg font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
                title="Zoom out"
              >
                −
              </button>
              <span className="min-w-[3rem] text-center text-sm font-medium text-stone-700 dark:text-stone-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
                disabled={zoom >= ZOOM_MAX}
                className="flex h-8 w-8 items-center justify-center rounded border border-stone-300 text-lg font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
                title="Zoom in"
              >
                +
              </button>
            </div>
          </div>

          <div
            ref={mapContainerRef}
            className="relative max-h-[60vh] overflow-auto rounded border border-stone-200 cursor-crosshair dark:border-stone-600"
            onClick={handleMapClick}
          >
            {imgSize.width && imgSize.height ? (
              <div
                className="relative inline-block"
                style={{
                  width: imgSize.width * zoom,
                  height: imgSize.height * zoom,
                }}
              >
                <div
                  className="relative origin-top-left"
                  style={{
                    width: imgSize.width,
                    height: imgSize.height,
                    transform: `scale(${zoom})`,
                    transformOrigin: "0 0",
                  }}
                >
                  <img
                    ref={imgRef}
                    src={map.url}
                    alt="Map"
                    className="block select-none"
                    draggable={false}
                    style={{
                      pointerEvents: "none",
                      width: imgSize.width,
                      height: imgSize.height,
                    }}
                    onLoad={handleImgLoad}
                  />
                {pushpins.map((pin) => (
                  <button
                    key={pin.identifier}
                    type="button"
                    className="absolute -translate-x-1/2 -translate-y-full cursor-pointer text-2xl focus:outline-none"
                    style={{
                      left: `${pin.x}%`,
                      top: `${pin.y}%`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(pin.identifier);
                    }}
                    title={`${pin.name} (click to remove)`}
                  >
                    📍
                  </button>
                ))}
                {pendingPoint && (
                  <div
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-full text-2xl"
                    style={{
                      left: `${pendingPoint.x}%`,
                      top: `${pendingPoint.y}%`,
                    }}
                  >
                    📍
                  </div>
                )}
              </div>
            </div>
            ) : (
              <div className="relative inline-block">
                <img
                  ref={imgRef}
                  src={map.url}
                  alt="Map"
                  className="block max-h-[60vh] w-auto max-w-full select-none"
                  draggable={false}
                  style={{ pointerEvents: "none" }}
                  onLoad={handleImgLoad}
                />
                {pushpins.map((pin) => (
                  <button
                    key={pin.identifier}
                    type="button"
                    className="absolute -translate-x-1/2 -translate-y-full cursor-pointer text-2xl focus:outline-none"
                    style={{
                      left: `${pin.x}%`,
                      top: `${pin.y}%`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(pin.identifier);
                    }}
                    title={`${pin.name} (click to remove)`}
                  >
                    📍
                  </button>
                ))}
                {pendingPoint && (
                  <div
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-full text-2xl"
                    style={{
                      left: `${pendingPoint.x}%`,
                      top: `${pendingPoint.y}%`,
                    }}
                  >
                    📍
                  </div>
                )}
              </div>
            )}
          </div>

          {pendingPoint && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800">
              <input
                type="text"
                value={addingName}
                onChange={(e) => setAddingName(e.target.value)}
                placeholder="Pushpin name"
                className="flex-1 rounded border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmAdd();
                  if (e.key === "Escape") setPendingPoint(null);
                }}
              />
              <button
                type="button"
                onClick={handleConfirmAdd}
                disabled={!addingName.trim()}
                className="rounded bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setPendingPoint(null)}
                className="rounded px-3 py-2 text-sm text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700"
              >
                Cancel
              </button>
            </div>
          )}

          {pushpins.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium text-stone-700 dark:text-stone-300">
                Pushpins ({pushpins.length}) — names & HTML content
              </h3>
              <div className="max-h-[40vh] space-y-4 overflow-y-auto pr-1">
                {pushpins.map((pin) => (
                  <div
                    key={pin.identifier}
                    className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-600 dark:bg-stone-900/40"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs text-stone-500 dark:text-stone-400">
                        {pin.identifier}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemove(pin.identifier)}
                        className="text-xs text-red-600 hover:underline dark:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                    <label className="block text-xs font-medium text-stone-600 dark:text-stone-400">
                      Name
                    </label>
                    <input
                      type="text"
                      value={pin.name}
                      onChange={(e) =>
                        updatePin(pin.identifier, { name: e.target.value })
                      }
                      className="mb-2 mt-0.5 w-full rounded border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                    />
                    <CollapsiblePushpinContent label="Content">
                      <PushpinHtmlEditor
                        key={pin.identifier}
                        editorKey={pin.identifier}
                        value={pin.html ?? ""}
                        onChange={(html) =>
                          updatePin(pin.identifier, { html })
                        }
                        placeholder="HTML content for this pushpin…"
                      />
                    </CollapsiblePushpinContent>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
