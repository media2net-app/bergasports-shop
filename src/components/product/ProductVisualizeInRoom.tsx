"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ProductAiLoadingOverlay from "@/components/product/ProductAiLoadingOverlay";
import { IMAGE_UPLOAD_ACCEPT, prepareImageDataUrlForUpload } from "@/lib/client-image-prepare";
import { PRODUCT_VISUALIZE_COPY, productVisualizeScene } from "@/lib/product-visualize-config";

type Props = {
  productId: number;
  productName: string;
  productCategory: string;
  productImage: string;
  enabled: boolean;
};

export default function ProductVisualizeInRoom({
  productId,
  productName,
  productCategory,
  productImage,
  enabled,
}: Props) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "result">("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scene = productVisualizeScene(productCategory, productName);

  const resetModal = useCallback(() => {
    setStep("upload");
    setPreview(null);
    setResultImage(null);
    setConsent(false);
    setError(null);
    setLoading(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    resetModal();
  }, [resetModal]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const onFile = (file: File | null) => {
    setError(null);
    setResultImage(null);
    if (!file) {
      setPreview(null);
      return;
    }
    setPreparingPhoto(true);
    void prepareImageDataUrlForUpload(file)
      .then((url) => setPreview(url))
      .catch((e) => {
        setPreview(null);
        setError(e instanceof Error ? e.message : "De foto kon niet worden verwerkt.");
      })
      .finally(() => setPreparingPhoto(false));
  };

  const generate = async () => {
    if (!preview) {
      setError("Upload eerst een foto van je ruimte.");
      return;
    }
    if (!consent) {
      setError(PRODUCT_VISUALIZE_COPY.consent);
      return;
    }
    if (!enabled) {
      setError("De dienst is momenteel niet beschikbaar.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/product-visualize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          imageDataUrl: preview,
          consent: true,
        }),
      });
      const data = (await res.json()) as {
        resultImageDataUrl?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "De preview is mislukt.");
      setResultImage(data.resultImageDataUrl ?? null);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "De preview is mislukt.");
    } finally {
      setLoading(false);
    }
  };

  const sceneHint = "Maak een duidelijke foto van de ruimte waar je het product wilt gebruiken.";

  const openFlow = () => {
    if (!enabled) {
      setError("AI-preview is momenteel niet beschikbaar. Probeer het later opnieuw.");
      setOpen(true);
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <div className="relative z-10">
        <button
          type="button"
          className="flex min-h-[3.25rem] w-full items-center justify-center gap-2.5 rounded-2xl bg-[#B38F27] px-4 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-[#96741f] active:scale-[0.99] sm:min-h-12 sm:rounded-full sm:text-sm"
          onClick={openFlow}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold"
            aria-hidden
          >
            AI
          </span>
          <span>{PRODUCT_VISUALIZE_COPY.button}</span>
        </button>
        <p className="mt-1.5 text-center text-xs text-[var(--foreground)]/60">
          Upload een foto — bekijk het product in je ruimte
        </p>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-[#1a0d24]/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-visualize-title"
        >
          <div className="mt-auto flex max-h-[min(94vh,900px)] min-h-0 flex-1 flex-col rounded-t-3xl bg-[#faf8f5] shadow-2xl sm:mt-8 sm:mx-auto sm:mb-8 sm:max-w-lg sm:flex-none sm:rounded-3xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[#e5dcc8] px-4 py-3 sm:px-6">
              <div className="min-w-0 pr-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#96741f]">AI Preview</p>
                <h2 id="product-visualize-title" className="truncate font-[family-name:var(--font-heading)] text-lg font-semibold text-[var(--foreground)]">
                  {PRODUCT_VISUALIZE_COPY.title}
                </h2>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e5dcc8] bg-white text-lg text-[var(--foreground)]"
                onClick={close}
                aria-label={PRODUCT_VISUALIZE_COPY.close}
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 [-webkit-overflow-scrolling:touch]">
              {step === "upload" ? (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-[var(--foreground)]/85">{PRODUCT_VISUALIZE_COPY.subtitle}</p>
                  <p className="rounded-xl bg-white px-3 py-2 text-xs text-[var(--foreground)]/75">{sceneHint}</p>

                  <div className="flex gap-3 rounded-xl border border-[#e5dcc8] bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={productImage}
                      alt=""
                      className="h-16 w-14 shrink-0 rounded-lg bg-[#f8f5fc] object-contain"
                    />
                    <p className="line-clamp-3 min-w-0 self-center text-xs font-medium text-[var(--foreground)]">{productName}</p>
                  </div>

                  <label className="block text-sm font-semibold text-[var(--foreground)]">{PRODUCT_VISUALIZE_COPY.uploadLabel}</label>
                  <div
                    className={`relative flex min-h-[160px] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed ${
                      preview ? "border-[#c4b5d8] bg-white" : "border-[#e5dcc8] bg-white"
                    }`}
                  >
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt="Jouw ruimte" className="max-h-[min(40vh,280px)] w-full object-contain" />
                    ) : (
                      <p className="px-4 text-center text-sm text-[var(--foreground)]/65">Galerij of camera</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="min-h-11 rounded-full bg-[#B38F27] px-3 py-2.5 text-xs font-semibold text-white sm:text-sm"
                      onClick={() => galleryInputRef.current?.click()}
                    >
                      Galerie
                    </button>
                    <button
                      type="button"
                      className="min-h-11 rounded-full border border-[#B38F27] px-3 py-2.5 text-xs font-semibold text-[var(--foreground)] sm:text-sm"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      Camera
                    </button>
                  </div>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept={IMAGE_UPLOAD_ACCEPT}
                    className="sr-only"
                    onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept={IMAGE_UPLOAD_ACCEPT}
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                  />

                  <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--foreground)]">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 shrink-0 accent-[#B38F27]"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>{PRODUCT_VISUALIZE_COPY.consent}</span>
                  </label>
                  <p className="text-[11px] text-[var(--foreground)]/55">{PRODUCT_VISUALIZE_COPY.privacyNote}</p>

              {preparingPhoto ? (
                <p className="text-center text-sm text-[var(--foreground)]/70">Foto wordt voorbereid…</p>
              ) : null}
              {error ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  {error}
                </p>
              ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[var(--foreground)]">
                    {PRODUCT_VISUALIZE_COPY.resultTitle}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]/60">Voor</p>
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt="Voor" className="aspect-[4/3] w-full rounded-xl border border-[#e5dcc8] object-cover" />
                      ) : null}
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#96741f]">Met product</p>
                      {resultImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resultImage}
                          alt="AI-preview"
                          className="aspect-[4/3] w-full rounded-xl border-2 border-[#96741f] object-cover shadow-md"
                        />
                      ) : null}
                    </div>
                  </div>
                  {resultImage ? (
                    <div className="overflow-hidden rounded-2xl border border-[#e5dcc8]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={resultImage} alt="Grote preview" className="w-full object-contain" />
                    </div>
                  ) : null}
                  <p className="text-xs text-[var(--foreground)]/55">
                    AI-gegenereerde preview — kleuren kunnen licht afwijken van het echte product.
                  </p>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-[#e5dcc8] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
              {step === "upload" ? (
                <button
                  type="button"
                  disabled={!preview || loading || preparingPhoto}
                  className="min-h-12 w-full rounded-full bg-[#B38F27] px-6 py-3 text-base font-semibold text-white disabled:opacity-50"
                  onClick={() => void generate()}
                >
                  {PRODUCT_VISUALIZE_COPY.generate}
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="min-h-12 rounded-full border border-[#B38F27] px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
                    onClick={() => {
                      setStep("upload");
                      setResultImage(null);
                    }}
                  >
                    {PRODUCT_VISUALIZE_COPY.tryAgain}
                  </button>
                  <button
                    type="button"
                    className="min-h-12 rounded-full bg-[#B38F27] px-4 py-3 text-sm font-semibold text-white"
                    onClick={close}
                  >
                    {PRODUCT_VISUALIZE_COPY.close}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <ProductAiLoadingOverlay
          photoPreview={preview}
          message={PRODUCT_VISUALIZE_COPY.loading}
          submessage={PRODUCT_VISUALIZE_COPY.loadingHint}
        />
      ) : null}
    </>
  );
}
