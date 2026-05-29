type Props = {
  photoPreview?: string | null;
  message: string;
  submessage?: string;
};

export default function ProductAiLoadingOverlay({ photoPreview, message, submessage }: Props) {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#1a0d24]/92 px-6 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-11 w-11 animate-spin rounded-full border-[3px] border-white/25 border-t-white" />
      <p className="mt-5 max-w-xs text-center text-base font-semibold text-white">{message}</p>
      {submessage ? (
        <p className="mt-2 max-w-sm text-center text-sm leading-relaxed text-white/75">{submessage}</p>
      ) : null}
      {photoPreview ? (
        <div className="mt-8 w-full max-w-[220px] overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoPreview} alt="" className="aspect-[4/3] w-full object-cover opacity-90" />
        </div>
      ) : null}
    </div>
  );
}
