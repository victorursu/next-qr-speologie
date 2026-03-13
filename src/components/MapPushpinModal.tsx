import { useState, useRef, useCallback } from "react";
import { nanoid } from "nanoid";

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
  const imgRef = useRef<HTMLImageElement>(null);

  const handleMapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const img = imgRef.current;
      if (!img) return;
      const rect = img.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setPendingPoint({ x, y });
      setAddingName("");
    },
    []
  );

  const handleConfirmAdd = useCallback(() => {
    if (!pendingPoint || !addingName.trim()) return;
    const newPin: Pushpin = {
      identifier: nanoid(10),
      x: pendingPoint.x,
      y: pendingPoint.y,
      name: addingName.trim(),
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
          <p className="mb-2 text-sm text-stone-500 dark:text-stone-400">
            Click on the map to add a pushpin, then enter a name.
          </p>

          <div
            className="relative inline-block cursor-crosshair max-w-full"
            onClick={handleMapClick}
          >
            <img
              ref={imgRef}
              src={map.url}
              alt="Map"
              className="max-h-[60vh] w-auto max-w-full select-none"
              draggable={false}
              style={{ pointerEvents: "none" }}
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
                className="absolute -translate-x-1/2 -translate-y-full text-2xl"
                style={{
                  left: `${pendingPoint.x}%`,
                  top: `${pendingPoint.y}%`,
                }}
              >
                📍
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
                Pushpins ({pushpins.length})
              </h3>
              <ul className="space-y-1 text-sm text-stone-600 dark:text-stone-400">
                {pushpins.map((pin) => (
                  <li key={pin.identifier}>
                    {pin.name} ({pin.identifier})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
