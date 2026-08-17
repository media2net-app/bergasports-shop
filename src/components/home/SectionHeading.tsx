import type { ReactNode } from "react";

type Props = {
  title: string;
  text?: string;
  eyebrow?: string;
  align?: "left" | "center";
  /** Optionele link/knop rechts van de titel (alleen bij align="left"). */
  action?: ReactNode;
};

export default function SectionHeading({
  title,
  text,
  eyebrow,
  align = "left",
  action,
}: Props) {
  const centered = align === "center";

  return (
    <div
      className={`mb-8 flex gap-4 ${
        centered ? "flex-col items-center text-center" : "flex-wrap items-end justify-between"
      }`}
    >
      <div className={centered ? "max-w-3xl" : "max-w-2xl"}>
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={`section-rule font-[family-name:var(--font-heading)] text-2xl tracking-tight text-[var(--foreground)] md:text-3xl ${
            centered ? "section-rule-center" : ""
          }`}
        >
          {title}
        </h2>
        {text ? (
          <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]/70 md:text-base">
            {text}
          </p>
        ) : null}
      </div>
      {action && !centered ? <div className="shrink-0 pb-1">{action}</div> : null}
    </div>
  );
}
