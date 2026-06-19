"use client";

import Image from "next/image";
import { useWorkspace } from "./workspace-provider";

export function LoginScreen() {
  const { handleLogin, loginError, loading } = useWorkspace();

  return (
    <main className="min-h-screen overflow-hidden bg-[#FAF8F5] px-5 py-8 text-brand-ink">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <form
          className="w-full max-w-md rounded-[24px] border border-brand-line bg-white p-6 shadow-[0_26px_70px_rgba(31,31,33,0.10)]"
          onSubmit={(event) => {
            event.preventDefault();
            handleLogin(new FormData(event.currentTarget));
          }}
        >
          <div className="mb-6 text-center">
            <Image src="/brand/logo-primary.png" alt="Foodie AI" width={210} height={70} className="mx-auto h-auto w-[210px]" priority />
          </div>
          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-normal text-brand-ink">Acceso</h2>
            <p className="mt-1 text-sm text-neutral-500">Ingresa con tus credenciales</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-brand-ink">Email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-[14px] border border-brand-line bg-[#F7F8FB] px-4 py-3 text-sm font-medium text-brand-ink outline-none transition placeholder:text-neutral-400 focus:border-brand-orange focus:bg-white focus:ring-4 focus:ring-brand-orange/10"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-brand-ink">Password</label>
              <input
                name="password"
                type="password"
                required
                className="w-full rounded-[14px] border border-brand-line bg-[#F7F8FB] px-4 py-3 text-sm font-medium text-brand-ink outline-none transition placeholder:text-neutral-400 focus:border-brand-orange focus:bg-white focus:ring-4 focus:ring-brand-orange/10"
                placeholder="Tu contrasena"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 h-12 w-full rounded-full bg-brand-orange px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(255,90,0,0.25)] transition hover:bg-[#E94F00] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
          {loginError ? (
            <p className="mt-4 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {loginError}
            </p>
          ) : null}
        </form>
      </div>
    </main>
  );
}
