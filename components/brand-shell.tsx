import type { ReactNode } from "react";

interface BrandShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  tone?: "default" | "compact";
  headerAside?: ReactNode;
}

export function BrandShell({
  eyebrow,
  title,
  description,
  children,
  tone = "default",
  headerAside
}: BrandShellProps) {
  return (
    <main className="min-h-screen px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto max-w-7xl">
        <div
          className={`rounded-[32px] border border-[#E7E3DE] bg-white/90 p-8 shadow-[0_20px_60px_rgba(31,31,33,0.08)] md:p-10 ${
            tone === "compact" ? "max-w-6xl" : ""
          }`}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#FF5A00]">{eyebrow}</p>
            {headerAside ? <div>{headerAside}</div> : null}
          </div>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.03em] text-[#1F1F21] md:text-6xl">
                {title}
              </h1>
            </div>
            <p className="max-w-xl text-sm leading-7 text-neutral-500 md:text-base">{description}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6">{children}</div>
      </div>
    </main>
  );
}
