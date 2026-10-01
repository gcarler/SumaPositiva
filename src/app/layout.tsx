import type { Metadata, Viewport } from "next";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/shared/ui/sonner";
import "./globals.css";
import { PanelHost } from "@/app/_components/panel-host";
import { SesionSync } from "@/app/_composition/sesion-sync";
import { QueryProvider } from "@/app/_composition/query-provider";

export const metadata: Metadata = {
  title: "POLIS — Política Pública de Seguridad Humana Integral de Cartagena",
  description:
    "Plataforma distrital de participación ciudadana para la construcción de la Política Pública de Seguridad Humana Integral de Cartagena de Indias (Decreto Distrital 037 de 2026).",
  keywords: [
    "seguridad humana integral",
    "Cartagena de Indias",
    "participación ciudadana",
    "políticas públicas",
    "presupuesto participativo",
    "consulta pública",
    "deliberación",
    "FONSET",
  ],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d10" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className="antialiased bg-background text-foreground font-sans"
      >
        <QueryProvider>
          <SesionSync />
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <MotionConfig reducedMotion="user">
            {children}

            {/* Zero-Modals: host global de paneles apilados */}
            <PanelHost />

            {/* Notificaciones */}
            <Toaster />
            </MotionConfig>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
