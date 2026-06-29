"use client";

import { useState, useTransition, Fragment } from "react";
import { useRouter } from "next/navigation";
import { resolveClassificationAction } from "@/app/dashboard/actions";
import styles from "./RevisionPanel.module.css";
import tableStyles from "./IncidentsTable.module.css";

import type { Incident } from "@/lib/types";
import { dimensionValue } from "@/lib/filters";
import { IncidentDetails } from "./IncidentDetails";

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
  pendientes: Incident[];
  categories: Cat[];
  empresaId: string;
  period: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<Record<string, { cat: string; sub: string }>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const visiblePendientes = pendientes.filter((p) => !hidden[p.id]);

  if (visiblePendientes.length === 0) return null;

  const subsOf = (catName: string) => categories.find((c) => c.name === catName)?.subcategories ?? [];

  const setCat = (id: string, cat: string) => setSel((s) => ({ ...s, [id]: { cat, sub: "" } }));
  const setSub = (id: string, sub: string) => setSel((s) => ({ ...s, [id]: { cat: s[id]?.cat ?? "", sub } }));

  function save(p: Incident) {
    const s = sel[p.id];
    // Mover el foco al contenedor de la tabla antes de deshabilitar el botón
    // y antes de que la fila desaparezca, para evitar que el navegador envíe 
    // el foco al <body> y haga scroll hacia el inicio de la página.
    document.getElementById("revision-panel-scroll")?.focus({ preventScroll: true });

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
        setTimeout(() => {
          setHidden((m) => ({ ...m, [p.id]: true }));
        }, 1500);
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
        Pendientes de revision <span className={styles.count}>({visiblePendientes.length})</span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} aria-hidden>
          ▸
        </span>
      </button>

      {open && (
        <div id="revision-panel-scroll" className={tableStyles.scroll} style={{ marginTop: "1rem" }} tabIndex={-1}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th className={tableStyles.chevronHeader}></th>
                <th>Numero</th>
                <th>Fecha</th>
                <th>Sucursal</th>
                <th>Reporte del cliente</th>
                <th>Causa</th>
                <th>Solucion (tecnico)</th>
                <th>Tipificacion</th>
              </tr>
            </thead>
            <tbody>
              {visiblePendientes.map((p) => {
                const s = sel[p.id] ?? { cat: "", sub: "" };
                return (
                  <Fragment key={p.id}>
                    <tr style={{ opacity: saved[p.id] ? 0.5 : 1 }}>
                      <td className={tableStyles.chevronCell} onClick={() => toggleRow(p.id)} style={{ cursor: "pointer" }}>
                        <span className={`${tableStyles.chevron} ${expandedIds.has(p.id) ? tableStyles.chevronOpen : ""}`}>
                          ▸
                        </span>
                      </td>
                      <td className={tableStyles.mono}>
                        <a
                          href={`https://webagentes.canaldirecto.com.ar/incidents/view/${p.numero}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={tableStyles.link}
                        >
                          {p.numero}
                        </a>
                      </td>
                      <td className={tableStyles.nowrap}>{p.fecha ?? "—"}</td>
                      <td>{dimensionValue(p, "sucursal") ?? "—"}</td>
                      <td className={tableStyles.desc}>
                        {cut(p.descripcion, 75)}
                      </td>
                      <td className={tableStyles.causa}>{p.causa ?? "—"}</td>
                      <td className={tableStyles.solucion}>
                        {cut(p.solucion, 75)}
                      </td>
                      <td>
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
                      </td>
                    </tr>
                    {expandedIds.has(p.id) && (
                      <tr className={tableStyles.expandedRow} onClick={(e) => e.stopPropagation()}>
                        <td colSpan={8} className={tableStyles.detailCellContent}>
                          <IncidentDetails 
                            inc={p} 
                            categories={categories}
                            empresaId={empresaId}
                            period={period}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
