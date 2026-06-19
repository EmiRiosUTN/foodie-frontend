"use client";

import { useEffect, useState } from "react";
import { BarChart3, Bot, ChevronDown, ChevronUp, MessageCircle, RefreshCw, Trash2, TrendingUp } from "lucide-react";
import {
  chatAssistantService,
  type ChatAnalyticsStats,
  type ChatFaq,
  type ChatFaqStats,
  type ChatImprovementSuggestion
} from "./chat-assistant-service";
import { useWorkspace } from "../workspace-provider";

type AssistantTab = "faqs" | "analytics" | "improvements";

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-brand-line bg-white p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-brand-ink">{value}</p>
    </div>
  );
}

function severityLabel(value: ChatImprovementSuggestion["severity"]) {
  return { high: "Alta", medium: "Media", low: "Baja" }[value];
}

function typeLabel(value: ChatImprovementSuggestion["type"]) {
  return {
    knowledge_gap: "Gaps de conocimiento",
    escalation: "Derivaciones a humano",
    sentiment: "Sentimiento negativo"
  }[value];
}

export function ChatAssistantModule() {
  const { chatSession } = useWorkspace();
  const currentClientId = chatSession.user?.role === "admin" ? undefined : chatSession.user?.clientId;
  const [activeTab, setActiveTab] = useState<AssistantTab>("faqs");
  const [faqs, setFaqs] = useState<ChatFaq[]>([]);
  const [faqStats, setFaqStats] = useState<ChatFaqStats | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [analytics, setAnalytics] = useState<ChatAnalyticsStats | null>(null);
  const [improvements, setImprovements] = useState<ChatImprovementSuggestion[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function loadFaqs() {
    setLoading(true);
    setFeedback("");
    try {
      const [faqData, statsData] = await Promise.all([
        chatAssistantService.getFaqs(currentClientId, {
          status: "active",
          category: selectedCategory === "all" ? undefined : selectedCategory,
          limit: 50
        }),
        chatAssistantService.getFaqStats(currentClientId)
      ]);
      setFaqs(faqData.faqs || []);
      setCategories(faqData.categories || []);
      setFaqStats(statsData.stats);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudieron cargar FAQs");
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics() {
    setLoading(true);
    setFeedback("");
    try {
      const data = await chatAssistantService.getAnalytics(currentClientId);
      setAnalytics(data.stats);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo cargar análisis");
    } finally {
      setLoading(false);
    }
  }

  async function loadImprovements() {
    setLoading(true);
    setFeedback("");
    try {
      const data = await chatAssistantService.getImprovements(currentClientId);
      setImprovements(data.suggestions || []);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudieron cargar mejoras");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "faqs") void loadFaqs();
    if (activeTab === "analytics") void loadAnalytics();
    if (activeTab === "improvements") void loadImprovements();
  }, [activeTab, selectedCategory]);

  async function analyzeFaqs() {
    setWorking(true);
    try {
      const data = await chatAssistantService.analyzeFaqs(currentClientId);
      setFeedback(`Análisis completado: ${data.stats.faqsGenerated} FAQs generadas sobre ${data.stats.messagesAnalyzed} mensajes`);
      await loadFaqs();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo analizar FAQs");
    } finally {
      setWorking(false);
    }
  }

  async function deleteFaq(id: string) {
    try {
      await chatAssistantService.deleteFaq(id);
      setFeedback("FAQ eliminada");
      await loadFaqs();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo eliminar la FAQ");
    }
  }

  async function generateImprovements() {
    setWorking(true);
    try {
      const data = await chatAssistantService.generateImprovements(currentClientId);
      setImprovements(data.suggestions || []);
      setFeedback(`Análisis completado: ${data.count} sugerencias generadas`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo generar mejoras");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2">
        {[
          { id: "faqs", label: "FAQs", icon: MessageCircle },
          { id: "analytics", label: "Análisis", icon: BarChart3 },
          { id: "improvements", label: "Mejoras", icon: TrendingUp }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AssistantTab)}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold ${
                activeTab === tab.id ? "bg-brand-ink text-white" : "bg-white text-brand-ink"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {feedback ? <div className="rounded-[20px] border border-brand-line bg-[#FFF7F2] px-5 py-3 text-sm text-brand-ink">{feedback}</div> : null}

      {activeTab === "faqs" ? (
        <div className="grid gap-5">
          <div className="flex flex-col gap-4 rounded-[28px] border border-brand-line bg-white p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold text-brand-ink">Preguntas frecuentes detectadas</p>
              <p className="text-sm text-neutral-500">
                {faqStats ? `${faqStats.totalFAQs} preguntas identificadas · ${faqStats.totalQuestions} consultas totales` : "Base generada desde conversaciones"}
              </p>
            </div>
            <button
              onClick={analyzeFaqs}
              disabled={working}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${working ? "animate-spin" : ""}`} />
              {working ? "Analizando..." : "Analizar preguntas"}
            </button>
          </div>

          {categories.length ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setSelectedCategory("all")} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedCategory === "all" ? "bg-brand-ink text-white" : "bg-white text-brand-ink"}`}>
                Todas
              </button>
              {categories.map((category) => (
                <button key={category} onClick={() => setSelectedCategory(category)} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedCategory === category ? "bg-brand-ink text-white" : "bg-white text-brand-ink"}`}>
                  {category}
                </button>
              ))}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-[28px] border border-brand-line bg-white p-10 text-center text-neutral-500">Cargando FAQs...</div>
          ) : faqs.length ? (
            <div className="grid gap-3">
              {faqs.map((faq) => (
                <div key={faq._id} className="rounded-[24px] border border-brand-line bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-ink">{faq.canonicalQuestion}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-[#FFF4ED] px-3 py-1 text-brand-orange">{faq.category}</span>
                        <span className="rounded-full bg-[#F7F4EF] px-3 py-1 text-neutral-600">{faq.totalCount} consultas</span>
                      </div>
                    </div>
                    <button onClick={() => deleteFaq(faq._id)} className="rounded-full border border-red-200 p-2 text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {faq.commonResponse ? <p className="mt-4 rounded-[18px] bg-[#F7F4EF] p-4 text-sm text-neutral-700">{faq.commonResponse}</p> : null}
                  {faq.variations?.length ? (
                    <div className="mt-4">
                      <button
                        onClick={() => setExpanded((current) => ({ ...current, [faq._id]: !current[faq._id] }))}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-orange"
                      >
                        {expanded[faq._id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        Consultas relacionadas ({faq.variations.length})
                      </button>
                      {expanded[faq._id] ? (
                        <div className="mt-3 grid gap-2">
                          {faq.variations.map((variation, index) => (
                            <div key={`${faq._id}-${index}`} className="rounded-[18px] border border-brand-line bg-[#FFFDF9] p-3 text-sm">
                              <p className="font-medium text-brand-ink">{variation.question}</p>
                              <p className="mt-1 text-xs text-neutral-500">{variation.count} consulta(s)</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-brand-line bg-white p-12 text-center">
              <Bot className="mx-auto h-10 w-10 text-neutral-300" />
              <p className="mt-3 font-semibold text-brand-ink">No hay preguntas frecuentes detectadas</p>
              <p className="mt-1 text-sm text-neutral-500">Ejecutá el análisis para generar FAQs desde conversaciones.</p>
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "analytics" ? (
        loading ? (
          <div className="rounded-[28px] border border-brand-line bg-white p-10 text-center text-neutral-500">Cargando análisis...</div>
        ) : analytics ? (
          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="Total mensajes" value={analytics.total} />
              <StatCard label="Recibidos" value={analytics.received} />
              <StatCard label="Enviados" value={analytics.sent} />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[28px] border border-brand-line bg-white p-5">
                <p className="font-semibold text-brand-ink">Temas más consultados</p>
                <div className="mt-4 grid gap-3">
                  {analytics.topCategories.map((category) => (
                    <div key={category.category}>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-brand-ink">{category.category}</span>
                        <span className="text-neutral-500">{category.count}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-[#F7F4EF]">
                        <div className="h-2 rounded-full bg-brand-orange" style={{ width: `${Math.min(100, category.count)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[28px] border border-brand-line bg-white p-5">
                <p className="font-semibold text-brand-ink">Horas pico</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {analytics.peakHours.map((hour) => (
                    <span key={hour} className="rounded-full bg-[#FFF4ED] px-3 py-1 text-sm font-semibold text-brand-orange">
                      {hour}
                    </span>
                  ))}
                  {!analytics.peakHours.length ? <p className="text-sm text-neutral-500">Sin datos suficientes.</p> : null}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border border-brand-line bg-white p-10 text-center text-neutral-500">No hay datos de análisis.</div>
        )
      ) : null}

      {activeTab === "improvements" ? (
        <div className="grid gap-5">
          <div className="flex flex-col gap-4 rounded-[28px] border border-brand-line bg-white p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold text-brand-ink">Sugerencias de mejora</p>
              <p className="text-sm text-neutral-500">Análisis de conversaciones para detectar oportunidades.</p>
            </div>
            <button
              onClick={generateImprovements}
              disabled={working}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${working ? "animate-spin" : ""}`} />
              {working ? "Analizando..." : "Generar análisis"}
            </button>
          </div>
          {loading ? (
            <div className="rounded-[28px] border border-brand-line bg-white p-10 text-center text-neutral-500">Cargando sugerencias...</div>
          ) : improvements.length ? (
            <div className="grid gap-3">
              {improvements.map((suggestion) => (
                <div key={suggestion._id} className="rounded-[24px] border border-brand-line bg-white p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#FFF4ED] px-3 py-1 text-xs font-semibold text-brand-orange">{typeLabel(suggestion.type)}</span>
                    <span className="rounded-full bg-[#F7F4EF] px-3 py-1 text-xs font-semibold text-neutral-600">{severityLabel(suggestion.severity)}</span>
                  </div>
                  <p className="mt-4 font-semibold text-brand-ink">{suggestion.title}</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">{suggestion.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-brand-line bg-white p-10 text-center text-neutral-500">No hay sugerencias generadas.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
