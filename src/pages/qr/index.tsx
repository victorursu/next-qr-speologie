import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { QRCodeSVG } from "qrcode.react";
import { CaveAutocomplete, type Cave } from "@/components/CaveAutocomplete";
import { getQrCaveUrl } from "@/lib/qr";
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
  pushpin_count?: number;
};

const PUSHPIN_QR_PREFIX = "speologie://qr/";

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
  const [includeLogo, setIncludeLogo] = useState(true);

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

  const generateQrDataUrl = async (
    url: string,
    withLogo: boolean
  ): Promise<string> => {
    const size = 512;
    const logoSize = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    await QRCode.toCanvas(canvas, url, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "H",
    });

    if (withLogo) {
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
          logo.src = "/speologie-org.png";
        });
      }
    }
    return canvas.toDataURL("image/png");
  };

  const handleDownload = async (qrUrl: string, slug: string) => {
    try {
      const dataUrl = await generateQrDataUrl(qrUrl, includeLogo);
      const link = document.createElement("a");
      link.download = `${slug.replace(/\//g, "-")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Failed to download");
    }
  };

  const handleDownloadSvg = async (qrUrl: string, slug: string) => {
    try {
      let svgString = await QRCode.toString(qrUrl, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 512,
      });

      if (includeLogo) {
        const logoRes = await fetch("/speologie-org.png");
        const logoBlob = await logoRes.blob();
        const logoDataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(logoBlob);
        });

        const doc = new DOMParser().parseFromString(svgString, "image/svg+xml");
        const svg = doc.documentElement;
        const vbParts = svg.getAttribute("viewBox")?.trim().split(/\s+/) ?? [];
        const vbW = Number(vbParts[2]) || 0;
        const vbH = Number(vbParts[3]) || vbW;
        const logoW = vbW * 0.25;
        const logoH = vbH * 0.25;
        const logoX = (vbW - logoW) / 2;
        const logoY = (vbH - logoH) / 2;

        const g = doc.createElementNS("http://www.w3.org/2000/svg", "g");
        const rect = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", String(logoX));
        rect.setAttribute("y", String(logoY));
        rect.setAttribute("width", String(logoW));
        rect.setAttribute("height", String(logoH));
        rect.setAttribute("fill", "#ffffff");
        const imageEl = doc.createElementNS("http://www.w3.org/2000/svg", "image");
        imageEl.setAttribute("href", logoDataUrl);
        imageEl.setAttributeNS(
          "http://www.w3.org/1999/xlink",
          "xlink:href",
          logoDataUrl
        );
        imageEl.setAttribute("x", String(logoX));
        imageEl.setAttribute("y", String(logoY));
        imageEl.setAttribute("width", String(logoW));
        imageEl.setAttribute("height", String(logoH));
        imageEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
        g.appendChild(rect);
        g.appendChild(imageEl);
        svg.appendChild(g);
        svgString = new XMLSerializer().serializeToString(doc);
      }

      const blob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${slug.replace(/\//g, "-")}.svg`;
      link.href = objectUrl;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error(err);
      alert("Failed to download SVG");
    }
  };

  const handleDownloadPdf = async (
    qrUrl: string,
    slug: string,
    caveName: string,
    itemId: string
  ) => {
    try {
      const dataUrl = await generateQrDataUrl(qrUrl, includeLogo);
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      const qrSize = 120; // 2x original (60)
      const qrX = (pageW - qrSize) / 2;

      // Page 1: main QR + cave name
      doc.addImage(dataUrl, "PNG", qrX, 20, qrSize, qrSize);
      doc.setFontSize(14);
      doc.text(caveName || slug, pageW / 2, 20 + qrSize + 12, {
        align: "center",
      });

      // Page 2+: pushpin QR codes
      const mapsRes = await fetch(`/api/qr/${itemId}/maps`);
      const maps: MapRecord[] = await mapsRes.json();
      const pushpins = maps.flatMap((m) => m.pushpins ?? []);

      for (const pin of pushpins) {
        const pushpinUrl = `${PUSHPIN_QR_PREFIX}${pin.identifier}`;
        const pinDataUrl = await generateQrDataUrl(pushpinUrl, includeLogo);
        doc.addPage();
        doc.addImage(pinDataUrl, "PNG", qrX, 20, qrSize, qrSize);
        doc.setFontSize(14);
        doc.text(pin.name || pin.identifier, pageW / 2, 20 + qrSize + 12, {
          align: "center",
        });
        doc.text(caveName || slug, pageW / 2, 20 + qrSize + 24, {
          align: "center",
        });
      }

      doc.save(`${slug.replace(/\//g, "-")}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF");
    }
  };

  return (
    <div className="min-h-screen w-full bg-transparent px-4 py-8">
      <header className="sticky top-0 z-20 -mx-4 -mt-8 mb-6 flex items-center justify-between gap-4 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <label className="shrink-0 text-sm font-medium text-stone-700">
            Filter cave
          </label>
          <div className="min-w-0 max-w-xs flex-1">
            <CaveAutocomplete
              value={caveFilter}
              onChange={setCaveFilter}
              placeholder="All caves"
              required={false}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={includeLogo}
              onChange={(e) => setIncludeLogo(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-sky-600 focus:ring-sky-500"
            />
            Include logo
          </label>
          <Link
            href="/qr/new"
            className="rounded-lg bg-sky-600 px-4 py-2 font-medium text-white transition-colors hover:bg-sky-700"
          >
            New QR
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded p-2 text-red-600 hover:bg-red-50"
            title="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <div className="w-full">

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
              className="mt-4 inline-block text-sky-600 hover:text-sky-700 dark:text-sky-500"
            >
              Create QR Code →
            </Link>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {items.map((item) => {
              const qrUrl = getQrCaveUrl(item.slug);
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleRowClick(item)}
                  onKeyDown={(e) => e.key === "Enter" && handleRowClick(item)}
                  className="flex cursor-pointer flex-col overflow-hidden rounded-lg border border-stone-200 bg-white transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700/50"
                >
                  <div className="flex flex-1 gap-4 p-4">
                    <div className="flex-shrink-0">
                      <div className="rounded border border-stone-200 bg-white p-2 dark:border-stone-600">
                        <QRCodeSVG
                          value={qrUrl}
                          size={128}
                          level="H"
                          {...(includeLogo && {
                            imageSettings: {
                              src: "/speologie-org.png",
                              height: 40,
                              width: 40,
                              excavate: true,
                            },
                          })}
                        />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Cave: {item.cave?.title ?? item.caves_id}({item.caves_id})
                      </p>
                      <p className="mt-1 font-mono text-sm font-medium text-stone-800 dark:text-stone-100">
                        {qrUrl}
                      </p>
                      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                        Adaugat la:{" "}
                        {new Date(item.created_at).toLocaleDateString("ro-RO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {(item.pushpin_count ?? 0) > 0 && (
                        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                          Pushpins with QR codes: {item.pushpin_count}
                        </p>
                      )}
                    </div>
                  </div>
                  <footer
                    className="flex justify-center gap-1 border-t border-stone-200 bg-stone-50 p-2 dark:border-stone-600 dark:bg-stone-800/50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() =>
                        handleDownloadPdf(
                          qrUrl,
                          item.slug,
                          item.cave?.title ?? item.caves_id ?? "",
                          item.id
                        )
                      }
                      className="rounded p-2 text-stone-600 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-700"
                      title="Download PDF"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <path d="M12 18v-6" />
                        <path d="M9 15l3 3 3-3" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDownload(qrUrl, item.slug)}
                      className="rounded p-2 text-stone-600 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-700"
                      title="Download PNG"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDownloadSvg(qrUrl, item.slug)}
                      className="rounded p-2 text-stone-600 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-700"
                      title="Download SVG"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                    </button>
                    <Link
                      href={`/qr/${item.id}/edit`}
                      className="rounded p-2 text-sky-600 hover:bg-sky-100 dark:text-sky-500 dark:hover:bg-sky-950"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded p-2 text-red-600 hover:bg-red-100 dark:text-red-500 dark:hover:bg-red-950"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </footer>
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
                      <button
                        type="button"
                        onClick={() => alert(url)}
                        className="cursor-pointer rounded p-1 hover:opacity-80"
                      >
                        <QRCodeSVG
                          value={url}
                          size={120}
                          level="H"
                          {...(includeLogo && {
                            imageSettings: {
                              src: "/speologie-org.png",
                              height: 32,
                              width: 32,
                              excavate: true,
                            },
                          })}
                        />
                      </button>
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
