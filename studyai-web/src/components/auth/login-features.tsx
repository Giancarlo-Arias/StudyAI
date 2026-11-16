"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DashboardIcon } from "@/components/dashboard/dashboard-icon";

const features = [
  {
    label: "Comprende",
    icon: "spark",
    title: "Resuelve tus dudas, en contexto.",
    description:
      "Consulta tus documentos y conecta las ideas con respuestas basadas en su contenido.",
  },
  {
    label: "Practica",
    icon: "quiz",
    title: "Convierte lo que lees en práctica.",
    description: "Crea cuestionarios desde tus documentos y pon a prueba lo que has aprendido.",
  },
  {
    label: "Avanza",
    icon: "chart",
    title: "Haz visible tu aprendizaje.",
    description: "Revisa tus resultados y descubre qué temas necesitan un nuevo repaso.",
  },
] as const;

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function LoginFeatures() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const playingBeforePointer = useRef<boolean | null>(null);
  const [interacting, setInteracting] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 1024px)");
    let timer: ReturnType<typeof setInterval> | undefined;
    function sync() {
      clearInterval(timer);
      if (!playing || interacting || motion.matches || !desktop.matches || document.hidden) return;
      timer = setInterval(() => setActive((value) => (value + 1) % features.length), 7000);
    }
    sync();
    motion.addEventListener("change", sync);
    desktop.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(timer);
      motion.removeEventListener("change", sync);
      desktop.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [playing, interacting]);

  return (
    <aside
      className="login-product hidden min-w-0 lg:block"
      aria-label="Descubre StudyAI"
      aria-roledescription="carrusel"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setPlaying(false)}
    >
      <div className="mb-6">
        <p className="mb-3 text-xs font-medium tracking-wide text-accent-foreground">
          TU FORMA DE APRENDER, CONECTADA
        </p>
        <h2 className="font-display text-[1.65rem] font-medium leading-snug tracking-[-.035em]">
          De la información
          <br />
          al conocimiento.
        </h2>
      </div>
      <div className="login-document-bar">
        <span className="login-document-icon">
          <DashboardIcon name="document" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Biología celular.pdf</p>
          <p className="mt-1 text-xs text-muted">Un documento. Más posibilidades.</p>
        </div>
        <span className="text-xs text-muted">PDF</span>
      </div>
      <div className="login-feature-stage" aria-live={playing ? "off" : "polite"}>
        {features.map((feature, index) => (
          <section
            key={feature.label}
            className="login-answer-card login-feature-slide"
            data-active={active === index}
            aria-hidden={active !== index}
            inert={active !== index}
            aria-roledescription="diapositiva"
            aria-label={`${index + 1} de ${features.length}`}
          >
            <div className="mb-4 flex items-center gap-2 text-xs font-medium text-accent-foreground">
              <DashboardIcon name={feature.icon} className="size-4" />
              {feature.label}
            </div>
            <h3 className="text-lg font-semibold leading-7 tracking-tight">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{feature.description}</p>
            <div className="login-feature-example mt-5">
              {index === 0 ? (
                <>
                  <p className="text-sm font-medium">¿Qué función tiene la mitocondria?</p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Produce ATP: la energía que la célula utiliza para realizar sus funciones.
                  </p>
                  <p className="mt-3 text-xs text-accent-foreground">Biología celular · Página 4</p>
                </>
              ) : index === 1 ? (
                <>
                  <p className="text-xs text-muted">Pregunta 1 de 5</p>
                  <p className="mt-2 text-sm font-medium">
                    ¿Dónde se produce la mayor parte del ATP?
                  </p>
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-foreground">
                    <DashboardIcon name="check" className="size-4" />
                    En la mitocondria
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Tu último cuestionario</p>
                    <span className="text-lg font-semibold text-accent-foreground">80 %</span>
                  </div>
                  <div className="login-feature-score mt-4" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <span key={value} data-complete={value < 5} />
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-muted">4 de 5 respuestas correctas</p>
                  <p className="mt-2 text-xs text-accent-foreground">Cada repaso cuenta.</p>
                </>
              )}
            </div>
          </section>
        ))}
      </div>
      <div className="login-feature-controls mt-5">
        <button
          type="button"
          onPointerDown={() => { playingBeforePointer.current = playing; }}
          onPointerCancel={() => { playingBeforePointer.current = null; }}
          onClick={() => {
            const previous = playingBeforePointer.current;
            playingBeforePointer.current = null;
            setPlaying((value) => !(previous ?? value));
          }}
          className="login-feature-play"
          disabled={reducedMotion}
          aria-label={
            reducedMotion
              ? "Presentación pausada por movimiento reducido"
              : playing
                ? "Pausar presentación"
                : "Reanudar presentación"
          }
        >
          <span
            aria-hidden="true"
            className={
              playing && !reducedMotion ? "login-feature-pause-icon" : "login-feature-play-icon"
            }
          />
          <span>{reducedMotion ? "Pausado" : playing ? "Pausar" : "Reanudar"}</span>
        </button>
        <div className="flex gap-1" role="group" aria-label="Funciones de StudyAI">
          {features.map((feature, index) => (
            <button
              key={feature.label}
              type="button"
              aria-pressed={active === index}
              onClick={() => {
                setPlaying(false);
                setActive(index);
              }}
              className="login-feature-control"
            >
              {feature.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted">Ejemplos ilustrativos de StudyAI</p>
    </aside>
  );
}
