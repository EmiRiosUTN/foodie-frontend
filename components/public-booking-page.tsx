"use client";

import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Minus, Plus } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";
type Profile = { name: string; logoUrl?: string | null; coverImageUrl?: string | null; whatsappPhone?: string | null; accentColor: string; minPartySize: number; maxPartySize: number; largePartyThreshold?: number | null; commentsEnabled?: boolean; publicInfo?: { phone?: string | null; menuUrl?: string | null; instagramUrl?: string | null; mapsUrl?: string | null }; supportedFeatures: string[]; branches: Array<{ slug: string; name: string }> };
type Slot = { time: string };
type Confirmation = { code: string; branch: string; date: string; time: string; partySize: number };

export function PublicBookingPage({ restaurantSlug }: { restaurantSlug: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [step, setStep] = useState(1); const [branch, setBranch] = useState(""); const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState(""); const [time, setTime] = useState(""); const [slots, setSlots] = useState<Slot[]>([]);
  const [fullName, setFullName] = useState(""); const [phone, setPhone] = useState(""); const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true); const [slotsLoading, setSlotsLoading] = useState(false); const [validating, setValidating] = useState(false); const [error, setError] = useState(""); const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/public/reservations/${restaurantSlug}`)
      .then(async (response) => { if (!response.ok) throw new Error(response.status === 409 ? "Las reservas online no est\u00e1n disponibles." : "No encontramos este restaurante."); return response.json() as Promise<Profile>; })
      .then((data) => { setProfile(data); setBranch(data.branches[0]?.slug || ""); setPartySize(Math.max(data.minPartySize, Math.min(2, data.maxPartySize))); })
      .catch((reason) => setError(reason.message)).finally(() => setLoading(false));
  }, [restaurantSlug]);

  useEffect(() => {
    if (!profile || step !== 3 || !date) return;
    setSlotsLoading(true);
    const query = new URLSearchParams({ branch, date, partySize: String(partySize) });
    fetch(`${API_URL}/public/reservations/${restaurantSlug}/availability?${query}`)
      .then(async (response) => { if (!response.ok) throw new Error("No pudimos consultar los horarios."); return response.json() as Promise<{ slots: Slot[] }>; })
      .then((data) => { setSlots(data.slots); if (!data.slots.some((slot) => slot.time === time)) setTime(""); })
      .catch((reason) => setError(reason.message)).finally(() => setSlotsLoading(false));
  }, [profile, step, branch, date, partySize, restaurantSlug]);

  const accent = profile?.accentColor || "#FF5A00";
  const whatsappUrl = profile?.whatsappPhone ? `https://wa.me/${profile.whatsappPhone.replace(/\D/g, "")}` : null;
  const branchName = profile?.branches.find((item) => item.slug === branch)?.name || "";
  const goBack = () => { setError(""); setStep((current) => current - 1); };
  const chooseDate = (nextDate: string) => { setDate(nextDate); setTime(""); };

  const continueBooking = async () => {
    setError("");
    if (step === 1 && !branch) return setError("Eleg\u00ed una sede para continuar.");
    if (step === 1 && profile?.largePartyThreshold && partySize > profile.largePartyThreshold) return setError("Para grupos grandes, escribinos por WhatsApp y coordinamos tu reserva.");
    if (step === 2 && !date) return setError("Eleg\u00ed una fecha para continuar.");
    if (step === 3) {
      if (!time) return setError("Eleg\u00ed un horario disponible.");
      setValidating(true);
      try {
        const response = await fetch(`${API_URL}/public/reservations/${restaurantSlug}/validate-slot`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ branch, date, partySize, time }) });
        if (!response.ok) throw new Error("Ese horario acaba de dejar de estar disponible. Eleg\u00ed otro.");
        setStep(4);
      } catch (reason) { setTime(""); setError(reason instanceof Error ? reason.message : "Ese horario ya no est\u00e1 disponible."); } finally { setValidating(false); }
      return;
    }
    if (step === 4) {
      if (!fullName.trim() || !phone.trim()) return setError("Complet\u00e1 tu nombre y tel\u00e9fono.");
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/public/reservations/${restaurantSlug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ branch, date, partySize, time, fullName, phone, notes: notes || undefined, website: "" }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result?.message?.message || result?.message || "No pudimos confirmar la reserva.");
        setConfirmation(result); setStep(5);
      } catch (reason) { setError(reason instanceof Error ? reason.message : "No pudimos confirmar la reserva."); } finally { setLoading(false); }
      return;
    }
    setStep((current) => current + 1);
  };

  if (loading && !profile) return <PublicFrame accent={accent}><Loading /></PublicFrame>;
  if (error && !profile) return <PublicFrame accent={accent}><Notice title="Reservas online" text={error} /></PublicFrame>;
  if (!profile) return null;
  return <PublicFrame accent={accent} cover={profile.coverImageUrl} logo={profile.logoUrl} name={profile.name}>
    <div className="mx-auto w-full max-w-xl px-5 py-7 sm:px-9 sm:py-10">
      <header className="mb-7"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.24em]" style={{ color: accent }}>Reserva online</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em] text-brand-ink">{profile.name}</h1></div><span className="rounded-full bg-[#FFF4ED] px-3 py-2 text-xs font-bold" style={{ color: accent }}>Paso {step}/5</span></div>{step < 5 ? <div className="mt-6 h-2 rounded-full bg-brand-cloud"><div className="h-full rounded-full transition-all" style={{ width: `${step * 25}%`, backgroundColor: accent }} /></div> : null}</header>
      {step === 1 ? <section className="space-y-5"><Heading title={"\u00bfD\u00f3nde quer\u00e9s reservar?"} text={"Eleg\u00ed la sede y la cantidad de personas."} /><div className="grid gap-3">{profile.branches.map((item) => <button type="button" key={item.slug} onClick={() => { setBranch(item.slug); setDate(""); setTime(""); }} className={`rounded-[22px] border p-4 text-left font-bold ${branch === item.slug ? "border-brand-orange bg-[#FFF4ED]" : "border-brand-line bg-white"}`}>{item.name}</button>)}</div><Counter value={partySize} min={profile.minPartySize} max={profile.maxPartySize} onChange={(value) => { setPartySize(value); setDate(""); setTime(""); }} />{whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-[22px] border border-[#25D366]/30 bg-[#EEF9F1] px-5 py-3 text-[#187A3E] transition hover:border-[#25D366]/60 hover:bg-[#E2F6E8] focus:outline-none focus:ring-4 focus:ring-[#25D366]/20"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white"><FaWhatsapp className="h-5 w-5" /></span><span className="text-left leading-tight"><span className="block text-sm font-extrabold">¿Reserva especial?</span><span className="mt-1 block text-xs font-semibold text-[#31834E]">Escribinos por WhatsApp</span></span><ChevronRight className="ml-auto h-5 w-5 transition-transform group-hover:translate-x-1" /></a> : null}</section> : null}
      {step === 2 ? <section className="space-y-5"><Heading title={"\u00bfQu\u00e9 d\u00eda te gustar\u00eda venir?"} text={`Sede: ${branchName}`} /><FoodieCalendar restaurantSlug={restaurantSlug} branch={branch} partySize={partySize} value={date} onChange={chooseDate} accent={accent} /></section> : null}
      {step === 3 ? <section className="space-y-6"><Heading title="Elegí un horario" text={`${date} \u00b7 ${partySize} personas`} />{slotsLoading ? <Loading /> : slots.length ? <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">{slots.map((slot) => <button type="button" key={slot.time} onClick={() => setTime(slot.time)} className={`rounded-2xl border px-3 py-4 font-bold transition ${time === slot.time ? "border-brand-orange bg-[#FFF4ED]" : "border-brand-line bg-white hover:border-brand-orange"}`}>{slot.time}</button>)}</div> : <Notice title="Sin horarios" text="No encontramos horarios para esta fecha. Probá con otro día." />}</section> : null}
      {step === 4 ? <section className="space-y-5"><Heading title="Tus datos" text={`${branchName} \u00b7 ${date} \u00b7 ${time} \u00b7 ${partySize} personas`} /><Field label="Nombre y apellido"><input value={fullName} onChange={(event) => setFullName(event.target.value)} className="foodie-input" autoComplete="name" /></Field><Field label="Teléfono"><input value={phone} onChange={(event) => setPhone(event.target.value)} className="foodie-input" inputMode="tel" autoComplete="tel" /></Field>{profile.commentsEnabled ? <Field label="Comentarios (opcional)"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="foodie-input min-h-24" /></Field> : null}</section> : null}
      {step === 5 ? <section className="py-6 text-center"><CheckCircle2 className="mx-auto h-16 w-16" style={{ color: accent }} /><h2 className="mt-5 text-3xl font-extrabold text-brand-ink">Reserva confirmada</h2><p className="mt-3 text-neutral-500">Tu reserva fue registrada correctamente.</p><div className="mt-7 rounded-[24px] bg-brand-cloud p-5 text-left"><b>{confirmation?.branch}</b><p className="mt-2">{confirmation?.date} · {confirmation?.time}</p><p>{confirmation?.partySize} personas</p><p className="mt-4 text-sm font-bold" style={{ color: accent }}>Código: {confirmation?.code}</p></div>{whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-center gap-2 rounded-full border border-[#25D366]/30 bg-[#EEF9F1] px-5 py-3 text-sm font-bold text-[#187A3E] transition hover:border-[#25D366]/60 hover:bg-[#E2F6E8]"><FaWhatsapp className="h-5 w-5" />¿Tenés dudas? Escribinos por WhatsApp</a> : null}</section> : null}
      {error ? <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}
      {step === 1 && profile.publicInfo && Object.values(profile.publicInfo).some(Boolean) ? <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-neutral-500">{profile.publicInfo.menuUrl ? <a className="rounded-full border border-brand-line px-3 py-2" href={profile.publicInfo.menuUrl} target="_blank" rel="noreferrer">Ver carta</a> : null}{profile.publicInfo.mapsUrl ? <a className="rounded-full border border-brand-line px-3 py-2" href={profile.publicInfo.mapsUrl} target="_blank" rel="noreferrer">Cómo llegar</a> : null}{profile.publicInfo.instagramUrl ? <a className="rounded-full border border-brand-line px-3 py-2" href={profile.publicInfo.instagramUrl} target="_blank" rel="noreferrer">Instagram</a> : null}{profile.publicInfo.phone ? <a className="rounded-full border border-brand-line px-3 py-2" href={`tel:${profile.publicInfo.phone}`}>Llamar</a> : null}</div> : null}
      {step < 5 ? <footer className="mt-8 flex gap-3">{step > 1 ? <button type="button" onClick={goBack} className="rounded-full border border-brand-line px-5 py-3 font-bold"><ArrowLeft className="h-4 w-4" /></button> : null}<button type="button" disabled={loading || slotsLoading || validating} onClick={() => void continueBooking()} className="flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 font-bold text-white disabled:opacity-60" style={{ backgroundColor: accent }}>{validating ? "Verificando..." : step === 4 ? "Confirmar reserva" : "Continuar"}<ChevronRight className="h-4 w-4" /></button></footer> : null}
    </div>
  </PublicFrame>;
}

function FoodieCalendar({ restaurantSlug, branch, partySize, value, onChange, accent }: { restaurantSlug: string; branch: string; partySize: number; value: string; onChange: (value: string) => void; accent: string }) {
  const initial = useMemo(() => new Date(), []); const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1)); const [available, setAvailable] = useState<Set<string>>(new Set()); const [loading, setLoading] = useState(false);
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  useEffect(() => { if (!branch) return; setLoading(true); const query = new URLSearchParams({ branch, month: monthKey, partySize: String(partySize) }); fetch(`${API_URL}/public/reservations/${restaurantSlug}/calendar?${query}`).then((response) => response.ok ? response.json() : Promise.reject()).then((data: { availableDates: string[] }) => setAvailable(new Set(data.availableDates))).catch(() => setAvailable(new Set())).finally(() => setLoading(false)); }, [restaurantSlug, branch, monthKey, partySize]);
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay(); const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return <div className="rounded-[24px] border border-brand-line bg-white p-4"><div className="flex items-center justify-between"><button type="button" aria-label="Mes anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-full p-2"><ChevronLeft className="h-4 w-4" /></button><b className="capitalize">{month.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}</b><button type="button" aria-label="Mes siguiente" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-full p-2"><ChevronRight className="h-4 w-4" /></button></div><div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-bold text-neutral-400">{"D L M M J V S".split(" ").map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="mt-3 grid grid-cols-7 gap-1">{Array.from({ length: firstWeekday }, (_, index) => <span key={`empty-${index}`} />)}{Array.from({ length: days }, (_, index) => { const current = `${monthKey}-${String(index + 1).padStart(2, "0")}`; const enabled = available.has(current); return <button type="button" key={current} disabled={!enabled || loading} onClick={() => onChange(current)} style={value === current ? { backgroundColor: accent } : undefined} className={`h-10 rounded-xl text-sm font-bold ${value === current ? "text-white" : enabled ? "text-brand-ink hover:bg-[#FFF4ED]" : "cursor-not-allowed text-neutral-300"}`}>{index + 1}</button>; })}</div>{loading ? <p className="mt-3 text-center text-xs text-neutral-400">Actualizando fechas...</p> : null}</div>;
}

function PublicFrame({ children, cover, logo, name }: { children: React.ReactNode; accent: string; cover?: string | null; logo?: string | null; name?: string }) { return <main className="flex min-h-screen items-center justify-center bg-brand-ink p-3 sm:p-10" style={{ backgroundImage: cover ? `linear-gradient(rgba(0,0,0,.38),rgba(0,0,0,.38)), url(${cover})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}><div className="w-full max-w-2xl rounded-[34px] border border-white/60 bg-white/90 shadow-[0_28px_80px_rgba(0,0,0,.32)] backdrop-blur-md sm:min-h-[600px]">{logo ? <img src={logo} alt={name || "Restaurante"} className="mx-auto h-20 w-auto pt-7 object-contain" /> : null}{children}</div></main>; }
function Heading({ title, text }: { title: string; text: string }) { return <div><h2 className="text-2xl font-extrabold tracking-[-.04em] text-brand-ink">{title}</h2><p className="mt-2 text-sm text-neutral-500">{text}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-2 text-sm font-bold text-brand-ink"><span>{label}</span>{children}</label>; }
function Counter({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (value: number) => void }) { return <div className="flex items-center justify-between rounded-[24px] border border-brand-line bg-white p-4"><span className="font-bold text-brand-ink">Personas</span><div className="flex items-center gap-5"><button type="button" disabled={value <= min} onClick={() => onChange(value - 1)} className="rounded-full border border-brand-line p-2 disabled:opacity-40"><Minus className="h-4 w-4" /></button><b className="w-6 text-center">{value}</b><button type="button" disabled={value >= max} onClick={() => onChange(value + 1)} className="rounded-full border border-brand-line p-2"><Plus className="h-4 w-4" /></button></div></div>; }
function Loading() { return <div className="flex justify-center py-14 text-brand-orange"><Loader2 className="h-7 w-7 animate-spin" /></div>; }
function Notice({ title, text }: { title: string; text: string }) { return <div className="rounded-[22px] border border-brand-line bg-brand-cloud p-5"><b className="text-brand-ink">{title}</b><p className="mt-2 text-sm text-neutral-500">{text}</p></div>; }
