"use client";

type StatusAlertProps = {
  message: string;
  tone?: "default" | "danger" | "success";
};

export function StatusAlert({ message, tone = "default" }: StatusAlertProps) {
  const toneClassName =
    tone === "danger"
      ? "border-[#F0C7B2] bg-[#FFF1EA] text-[#B65221]"
      : tone === "success"
        ? "border-[#CFE3D7] bg-[#F4FBF7] text-[#2E6A46]"
        : "border-[#F0D8CA] bg-[#FFF7F2] text-[#9A5B38]";

  return <p className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${toneClassName}`}>{message}</p>;
}
