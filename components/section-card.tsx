import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function SectionCard({ title, subtitle, children }: SectionCardProps) {
  return (
    <section className="rounded-[28px] border border-[#E7E3DE] bg-white/85 p-5 shadow-[0_18px_40px_rgba(31,31,33,0.06)] md:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#1F1F21]">{title}</h2>
        <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}
