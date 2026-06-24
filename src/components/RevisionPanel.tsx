"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveClassificationAction } from "@/app/dashboard/actions";
import styles from "./RevisionPanel.module.css";

interface Pendiente {
  id: string;
  numero: string;
  descripcion: string;
  causa?: string;
  solucion?: string;
}
interface Cat {
  name: string;
  subcategories: string[];
}

/**
 * Cola de revision: lista los incidentes que quedaron "Pendiente de revision"
 * (confianza no alta de la IA, o sin clasificar) para que el usuario/gerente les
 * asigne la categoria/subcategoria correcta. Al guardar se fija como override.
 */
export default function RevisionPanel({
  pendientes,
  categories,
  empresaId,
  period,
}: {
  pendientes: Pendiente[];
  categories: Cat[];
  empresaId: string;
  period: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<Record<string, { cat: string; sub: string }>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();

  if (pendientes.length === 0) return null;

  const subsOf = (catName: string) => categories.find((c) => c.name === catName)?.subcategories ?? [];

  const setCat = (id: string, cat: string) => setSel((s) => ({ ...s, [id]: { cat, sub: "" } }));
  const setSub = (id: string, sub: string) => setSel((s) => ({ ...s, [id]: { cat: s[id]?.cat ?? "", sub } }));

  function save(p: Pendiente) {
    const s = sel[p.id];
    if (!s?.cat || !s?.sub) return;
    startTransition(async () => {
      const res = await resolveClassificationAction(
        { descripcion: p.descripcion, causa: p.causa, solucion: p.solucion },
        s.cat,
        s.sub,
        empresaId,
        period,
      );
      if (res.ok) {
        setSaved((m) => ({ ...m, [p.id]: true }));
        router.refresh();
      }
    });
  }

  const cut = (s: string | undefined, n: number) => {
    const t = (s || "").replace(/\s+/g, " ").trim();
    return t.length > n ? t.slice(0, n - 1) + "…" : t;
  };

  return (
    <section className={`card ${styles.card}`}>
      <button type="button" className={styles.head} onClick={() => setOpen((o) => !o)}>
        <span className={styles.dot} />
        Pendientes de revision <span className={styles.count}>({pendientes.length})</span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} aria-hidden>
          ▸
        </span>
      </button>

      {open && (
        <div className={styles.list}>
          {pendientes.map((p) => {
            const s = sel[p.id] ?? { cat: "", sub: "" };
            return (
              <div key={p.id} className={`${styles.row} ${saved[p.id] ? styles.rowSaved : ""}`}>
                <div className={styles.info}>
                  <span className={styles.numero}>#{p.numero}</span>
                  {cut(p.descripcion, 110)}
                  {p.solucion ? (
                    <span className={styles.solucion}>
                      <span className={styles.solucionLabel}>Solucion:</span> {cut(p.solucion, 130)}
                    </span>
                  ) : null}
                </div>
                <div className={styles.controls}>
                  <select className="select" value={s.cat} disabled={pending || saved[p.id]} onChange={(e) => setCat(p.id, e.target.value)}>
                    <option value="">— Categoria —</option>
                    {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  <select className="select" value={s.sub} disabled={pending || saved[p.id] || !s.cat} onChange={(e) => setSub(p.id, e.target.value)}>
                    <option value="">— Subcategoria —</option>
                    {subsOf(s.cat).map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => save(p)}
                    disabled={pending || saved[p.id] || !s.cat || !s.sub}
                    className={`${styles.save} ${saved[p.id] ? styles.saveDone : ""}`}
                  >
                    {saved[p.id] ? "Guardado ✓" : "Guardar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
