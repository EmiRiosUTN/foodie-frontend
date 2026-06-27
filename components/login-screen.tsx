"use client";

import Image from "next/image";
import { useWorkspace } from "./workspace-provider";

export function LoginScreen() {
  const { handleLogin, loginError, loading } = useWorkspace();

  return (
    <main className="h-screen w-screen overflow-hidden bg-black text-white">
      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_100%_0%,#020202_0%,#080707_25%,transparent_46%),radial-gradient(circle_at_0%_100%,#020202_0%,#080707_25%,transparent_46%),radial-gradient(circle_at_0%_0%,rgba(244,81,30,0.96)_0%,rgba(244,81,30,0.72)_22%,transparent_52%),radial-gradient(circle_at_100%_100%,rgba(244,81,30,0.96)_0%,rgba(244,81,30,0.72)_22%,transparent_52%),linear-gradient(135deg,#F4511E_0%,#3A201E_42%,#050505_50%,#3A201E_58%,#F4511E_100%)] px-8 py-10">
        <div className="grid w-full max-w-7xl items-center gap-10 md:grid-cols-[minmax(520px,760px)_minmax(360px,440px)] md:justify-center md:gap-20 xl:gap-28">
          <div className="flex min-w-0 justify-center md:justify-start">
            <Image
              src="/brand/logo-white.png"
              alt="Foodie AI"
              width={2480}
              height={840}
              priority
              className="h-auto w-[min(760px,82vw)] md:w-[720px] xl:w-[760px]"
            />
          </div>

        <form
          className="w-full max-w-md justify-self-center"
          onSubmit={(event) => {
            event.preventDefault();
            handleLogin(new FormData(event.currentTarget));
          }}
        >
          <div className="mb-8">
            <h1 className="text-6xl font-extrabold tracking-[-0.06em] text-white md:text-7xl">Hola!</h1>
            <p className="mt-2 text-2xl font-extrabold text-white">Listo para gestionar tu negocio?</p>
          </div>

          <div className="space-y-6">
            <label className="block">
              <span className="mb-2 block text-xl font-medium text-white">Email</span>
              <input
                name="email"
                type="email"
                required
                className="h-11 w-full rounded-full border-0 bg-white px-5 text-lg font-medium text-[#1F1F21] outline-none transition placeholder:text-neutral-500 focus:ring-4 focus:ring-white/20"
                placeholder="tu@email.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xl font-medium text-white">Contrasena / password</span>
              <input
                name="password"
                type="password"
                required
                className="h-11 w-full rounded-full border-0 bg-white px-5 text-lg font-medium text-[#1F1F21] outline-none transition placeholder:text-neutral-500 focus:ring-4 focus:ring-white/20"
                placeholder="Tu contrasena"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-9 h-12 w-full rounded-full bg-brand-orange px-5 text-xl font-extrabold text-white transition hover:bg-[#E94F00] disabled:cursor-not-allowed disabled:opacity-70"
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
      </div>
    </main>
  );
}
