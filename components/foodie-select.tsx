"use client";

import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

type FoodieSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function FoodieSelect({ className = "", children, ...props }: FoodieSelectProps) {
  return (
    <div className="group relative">
      <select
        {...props}
        className={`w-full appearance-none rounded-2xl border border-[#E7D8CA] bg-[#FFFCF8] px-4 py-3 pr-12 text-sm text-brand-ink shadow-[0_8px_24px_rgba(31,31,33,0.05)] outline-none transition hover:border-[#D9C1AF] focus:border-brand-orange focus:bg-white focus:shadow-[0_0_0_4px_rgba(255,90,0,0.12)] disabled:cursor-not-allowed disabled:bg-[#F4EEE8] disabled:text-neutral-400 ${className}`}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#9B7B65] transition group-focus-within:text-brand-orange">
        <ChevronDown className="h-4 w-4" strokeWidth={2.2} />
      </span>
    </div>
  );
}
