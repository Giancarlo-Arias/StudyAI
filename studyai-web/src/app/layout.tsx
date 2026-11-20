import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = localFont({
  src: [
    {
      path: "../assets/fonts/Poppins-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../assets/fonts/Poppins-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "StudyAI | Aprende con inteligencia artificial",
    template: "%s | StudyAI",
  },
  description:
    "Transforma tus documentos en herramientas de estudio con inteligencia artificial. Genera cuestionarios, evalúa tu conocimiento y sigue tu progreso.",
};

const themeRestoreScript = `
  (function () {
    const root = document.documentElement;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

    function syncBrowserColor() {
      const theme = root.getAttribute("data-theme");
      const isDark = theme === "dark" || (theme !== "light" && systemTheme.matches);
      document.querySelector('meta[name="theme-color"]')?.setAttribute(
        "content",
        isDark ? "#121215" : "#f2f4fb",
      );
    }

    try {
      const theme = localStorage.getItem("studyai-theme");
      if (localStorage.getItem("studyai-sidebar") === "collapsed") root.setAttribute("data-sidebar", "collapsed");

      if (theme === "light" || theme === "dark") {
        root.setAttribute("data-theme", theme);
      } else {
        root.removeAttribute("data-theme");
      }
    } catch {}

    syncBrowserColor();
    window.addEventListener("studyai-theme-change", syncBrowserColor);
    systemTheme.addEventListener("change", syncBrowserColor);
  })();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#f2f4fb" />
        <script>{themeRestoreScript}</script>
      </head>
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
