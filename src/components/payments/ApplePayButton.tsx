"use client";

type Props = {
  disabled?: boolean;
  onClick: () => void;
  className?: string;
};

/** Apple Pay express CTA — triggers Mollie payment with method=applepay. */
export default function ApplePayButton({ disabled, onClick, className = "" }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-11 w-full items-center justify-center rounded-md bg-black px-4 text-sm font-semibold text-white transition hover:bg-black/90 disabled:opacity-50 ${className}`}
      aria-label="Betaal met Apple Pay"
    >
       Pay
    </button>
  );
}
