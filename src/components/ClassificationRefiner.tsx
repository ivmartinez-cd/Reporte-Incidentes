"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { refineClassificationAction } from "@/app/dashboard/actions";

/**
 * Dispara el refinamiento por IA de los incidentes que el render rapido dejo con
 * el heuristico provisional. Vive en el cliente para no bloquear la pagina: al
 * montar, si hay `pending`, llama a la server action; si clasifico algo nuevo,
 * refresca la ruta para mostrar el resultado de IA. Si Gemini esta saturado, se
 * queda con el heuristico (sin bucle) y ofrece reintentar.
 *
 * `lastTriggered` evita re-disparar para el MISMO valor de `pending`: tras un
 * refresh parcial, `pending` baja y vuelve a intentar con el resto; si no hubo
 * progreso (mismo numero) no reintenta solo.
 */
export default function ClassificationRefiner({
  empresaId,
  period,
  pending,
}: {
  empresaId: string;
  period: string;
  pending: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "refining" | "failed">("idle");
  const lastTriggered = useRef<number | null>(null);

  function run() {
    lastTriggered.current = pending;
    setState("refining");
    refineClassificationAction(empresaId, period)
      .then((res) => {
        if (res.progressed) router.refresh();
        else setState("failed");
      })
      .catch(() => setState("failed"));
  }

  useEffect(() => {
    if (pending <= 0) {
      setState("idle");
      return;
    }
    if (lastTriggered.current === pending) return;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, empresaId, period]);

  if (pending <= 0 || state === "idle") return null;

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
        background: "rgba(1, 76, 140, 0.92)",
        color: "#fff",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        fontSize: 14,
        backdropFilter: "blur(8px)",
      }}
    >
      {state === "refining" ? (
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
            Refinando clasificacion con IA… ({pending} pendiente
            {pending === 1 ? "" : "s"})
          </span>
          <style>{`@keyframes cd-refine-spin{to{transform:rotate(360deg)}}`}</style>
        </>
      ) : (
        <>
          <span>⚠ IA saturada; mostrando clasificacion provisional.</span>
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
            }}
          >
            Reintentar
          </button>
        </>
      )}
    </div>
  );
}
