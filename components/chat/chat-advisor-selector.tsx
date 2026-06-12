"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { FoodieSelect } from "../foodie-select";
import { chatAdvisorService, type ChatAdvisor } from "./chat-advisor-service";

export function ChatAdvisorSelector({
  selectedAdvisorId,
  onSelect,
  disabled = false
}: {
  selectedAdvisorId: string | null;
  onSelect: (advisorId: string | null) => void;
  disabled?: boolean;
}) {
  const [advisors, setAdvisors] = useState<ChatAdvisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await chatAdvisorService.getAdvisors();
        setAdvisors(data.filter((advisor) => advisor.active));
      } catch (err: any) {
        setError(err.response?.data?.message || "No se pudieron cargar los asesores");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-brand-line bg-[#FCFAF7] px-4 py-5">
        <Loader2 className="h-5 w-5 animate-spin text-brand-orange" />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl border border-[#F0C7B2] bg-[#FFF1EA] px-4 py-3 text-sm text-[#B65221]">{error}</div>;
  }

  return (
    <FoodieSelect
      value={selectedAdvisorId || ""}
      onChange={(event) => onSelect(event.target.value || null)}
      disabled={disabled}
      className="font-medium"
    >
      <option value="">Sin asignar</option>
      {advisors.map((advisor) => (
        <option key={advisor._id} value={advisor._id}>
          {advisor.name}
          {advisor.email ? ` (${advisor.email})` : ""}
        </option>
      ))}
    </FoodieSelect>
  );
}
