import { Clock3 } from "lucide-react";
import { WorkspaceShell } from "./workspace-shell";

export function ConfigurationComingSoonPage() {
  return (
    <WorkspaceShell title="Próximamente" description="Estamos preparando nuevas herramientas para tu restaurante.">
      <section className="flex min-h-[360px] flex-col items-center justify-center rounded-[26px] border border-brand-line bg-white p-8 text-center">
        <div className="mb-5 rounded-full bg-brand-orange/10 p-4 text-brand-orange">
          <Clock3 className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-brand-ink">Próximamente</h2>
        <p className="mt-2 max-w-md text-sm text-neutral-500">Esta sección estará disponible en una próxima actualización.</p>
      </section>
    </WorkspaceShell>
  );
}
