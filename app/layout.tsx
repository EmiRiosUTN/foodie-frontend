import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Foodie AI | Operacion Restaurante",
  description: "Plataforma operativa para reservas, salon, clientes y conversaciones."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
