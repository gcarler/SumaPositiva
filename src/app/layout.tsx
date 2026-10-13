import type { Metadata, Viewport } from "next";
import "@/core/zod-init";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/shared/ui/sonner";
import "./globals.css";
import { PanelHost } from "@/app/_components/panel-host";
import { SesionSync } from "@/app/_composition/sesion-sync";
import { QueryProvider } from "@/app/_composition/query-provider";
import { RegisterServiceWorker } from "@/shared/pwa/register-sw";
import { ErrorBoundary } from "@/shared/monitoring";

export const metadata: Metadata = {
  title: "POLIS — Política Pública de Seguridad Humana Integral de Cartagena",
  description:
    "Plataforma distrital de participación ciudadana para la construcción y rendición de cuentas de la Política Pública de Seguridad Humana Integral de Cartagena de Indias.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "POLIS Cartagena",
  },
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
  width: "device-width",
  initialScale: 1,
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
        className="antialiased bg-background text-foreground font-sans min-w-0 overflow-x-hidden"
      >
        <QueryProvider>
          <RegisterServiceWorker />
          <SesionSync />
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <MotionConfig reducedMotion="user">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>

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
