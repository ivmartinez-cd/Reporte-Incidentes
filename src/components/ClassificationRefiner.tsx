"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refineClassificationAction } from "@/app/dashboard/actions";

/**
 * Dispara el refinamiento por IA de los incidentes que el render rapido dejo con
 * el heuristico provisional. Vive en el cliente para no bloquear la pagina: al
 * montar, si hay `pending`, llama a la server action; si clasifico algo nuevo,
 * refresca la ruta para mostrar el resultado de IA. Si Gemini esta saturado, se
 * queda con el heuristico (sin bucle) y ofrece reintentar.
 *
 * Incluye un temporizador en tiempo real para indicar la duración del proceso.
 */
export default function ClassificationRefiner({
  empresaId,
  periods,
  pending,
}: {
  empresaId: string;
  periods: string[];
  pending: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<"idle" | "refining" | "failed" | "success">("idle");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [finalDuration, setFinalDuration] = useState<number | null>(null);

  const lastTriggered = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastEmpresaId = useRef(empresaId);
  const periodsKey = periods.join(",");
  const lastPeriodsKey = useRef(periodsKey);

  function run() {
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
      setElapsedTime(0);
      setFinalDuration(null);
    }
    lastTriggered.current = pending;
    setState("refining");

    refineClassificationAction(empresaId, periods)
      .then((res) => {
        if (res.progressed) {
          startTransition(() => {
            router.refresh();
          });
        } else {
          if (startTimeRef.current) {
            setFinalDuration((Date.now() - startTimeRef.current) / 1000);
          }
          setState("failed");
          startTimeRef.current = null;
        }
      })
      .catch(() => {
        if (startTimeRef.current) {
          setFinalDuration((Date.now() - startTimeRef.current) / 1000);
        }
        setState("failed");
        startTimeRef.current = null;
      });
  }

  // Efecto para limpiar/reiniciar cuando cambia el contexto (empresa o periodos)
  useEffect(() => {
    if (lastEmpresaId.current !== empresaId || lastPeriodsKey.current !== periodsKey) {
      startTimeRef.current = null;
      setElapsedTime(0);
      setFinalDuration(null);
      setState("idle");
      lastTriggered.current = null;
      lastEmpresaId.current = empresaId;
      lastPeriodsKey.current = periodsKey;
    }

    if (pending <= 0) {
      if (state === "refining") {
        const duration = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0;
        setFinalDuration(duration);
        setState("success");
        startTimeRef.current = null;

        const timer = setTimeout(() => {
          setState("idle");
        }, 4000);
        return () => clearTimeout(timer);
      } else if (state !== "success") {
        setState("idle");
      }
      return;
    }

    if (lastTriggered.current === pending) return;

    setElapsedTime(0);
    setFinalDuration(null);
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, empresaId, periodsKey]);

  // Efecto para actualizar el temporizador en tiempo real
  useEffect(() => {
    if (state !== "refining") return;

    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime((Date.now() - startTimeRef.current) / 1000);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [state]);

  if (pending <= 0 && state !== "success") return null;
  if (state === "idle") return null;

  // Elegante transición de color según el estado
  let bg = "rgba(1, 76, 140, 0.92)"; // Azul de refinación
  if (state === "success") {
    bg = "rgba(22, 101, 52, 0.95)"; // Verde éxito
  } else if (state === "failed") {
    bg = "rgba(153, 27, 27, 0.95)"; // Rojo fallo
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderRadius: 12,
        background: bg,
        color: "#fff",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        fontSize: 14,
        backdropFilter: "blur(8px)",
        transition: "background-color 0.4s ease, opacity 0.4s ease, transform 0.3s ease",
      }}
    >
      {state === "refining" && (
        <>
          <span
            aria-hidden
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.35)",
              borderTopColor: "#f0a400",
              display: "inline-block",
              animation: "cd-refine-spin 0.8s linear infinite",
            }}
          />
          <span>
            Refinando clasificación con IA… ({pending} pendiente
            {pending === 1 ? "" : "s"}) · <strong>{elapsedTime.toFixed(1)}s</strong>
          </span>
          <style>{`@keyframes cd-refine-spin{to{transform:rotate(360deg)}}`}</style>
        </>
      )}

      {state === "success" && (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "#45f3ff" }}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Clasificación completada con éxito en <strong>{finalDuration?.toFixed(1)}s</strong>
        </span>
      )}

      {state === "failed" && (
        <>
          <span>
            ⚠ IA saturada; mostrando clasificación provisional ({finalDuration?.toFixed(1)}s)
          </span>
          <button
            type="button"
            onClick={run}
            style={{
              background: "#f0a400",
              color: "#1a1a1a",
              border: "none",
              borderRadius: 8,
              padding: "4px 10px",
              cursor: "pointer",
              fontWeight: 600,
              marginLeft: 4,
              transition: "transform 0.1s ease",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            Reintentar
          </button>
        </>
      )}
    </div>
  );
}
