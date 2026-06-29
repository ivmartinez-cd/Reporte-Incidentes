"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveClassificationAction } from "@/app/dashboard/actions";
import { type Incident } from "@/lib/types";
import { dimensionValue } from "@/lib/filters";
import styles from "./IncidentsTable.module.css";

function UserIcon() {
  return (
    <svg className={styles.metaIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function TechIcon() {
  return (
    <svg className={styles.metaIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function DeviceIcon() {
  return (
    <svg className={styles.metaIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0a2 2 0 10-4 0 2 2 0 004 0zm-8-8a2 2 0 11-4 0 2 2 0 014 0zM4 6h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className={styles.metaIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function WorkTypeIcon() {
  return (
    <svg className={styles.metaIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

// Renderiza el reporte de cliente estructurado en una jerarquia visual limpia
function renderClientReport(text: string) {
  if (!text) return <p className={styles.fullText}>—</p>;
  
  const parts = text.split(/\s*—\s*/);
  const motivo = parts[0];
  const resto = parts.slice(1).join(" — ");
  
  // Filtramos 'funcionamiento ok' ya que es una nota de resolucion tecnica, no un reporte del cliente.
  const items = resto 
    ? resto.split(/\s*·\s*/)
        .filter(Boolean)
        .map(item => item.trim())
        .filter(item => !item.toLowerCase().includes("funcionamiento ok")) 
    : [];
  
  return (
    <div className={styles.fullText} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ fontWeight: 600, color: "var(--text)" }}>
        {motivo}
      </div>
      {items.length > 0 && (
        <ul style={{ paddingLeft: "1.1rem", margin: 0, listStyleType: "disc" }}>
          {items.map((item, idx) => {
            const lower = item.toLowerCase();
            const isInternal = lower.includes("sicop") || lower.includes("llamar a la ma") || lower.includes("153017");
            
            let itemStyle = { 
              color: "var(--text-soft)", 
              fontSize: "0.85rem",
              marginTop: "0.2rem",
              fontStyle: "normal",
              fontWeight: "normal"
            };
            let badge = null;
            
            if (isInternal) {
              itemStyle.color = "var(--text-muted)";
              itemStyle.fontStyle = "italic";
              badge = (
                <span style={{ 
                  fontSize: "0.65rem", 
                  marginLeft: "0.4rem", 
                  color: "#d97706", 
                  border: "1px solid rgba(217, 119, 6, 0.4)", 
                  padding: "0.05rem 0.25rem", 
                  borderRadius: "4px", 
                  fontStyle: "normal",
                  background: "rgba(245, 158, 11, 0.05)",
                  fontWeight: 600
                }}>
                  Nota Interna
                </span>
              );
            }
            
            return (
              <li key={idx} style={itemStyle}>
                {item}
                {badge}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Determina los colores de los badges de estado
export function getEstadoStyle(estado?: string) {
  const e = (estado ?? "").toLowerCase();
  if (e === "resuelto" || e === "cerrado") {
    return { color: "var(--success)", borderColor: "var(--success)" };
  }
  if (e === "abierto") {
    return { color: "var(--primary)", borderColor: "var(--primary)" };
  }
  return { color: "var(--warning)", borderColor: "var(--warning)" };
}

export function IncidentDetails({ 
  inc,
  categories,
  empresaId,
  period,
}: { 
  inc: Incident;
  categories: { name: string; subcategories: string[] }[];
  empresaId: string;
  period: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cat, setCat] = useState("");
  const [sub, setSub] = useState("");
  const [saved, setSaved] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const categoria = dimensionValue(inc, "categoria");
  const solucion = inc.solucion || "—";
  const estadoEstilo = getEstadoStyle(inc.estado);

  const subsOf = (catName: string) => categories.find((c) => c.name === catName)?.subcategories ?? [];

  function save() {
    if (!cat || !sub) return;
    startTransition(async () => {
      const res = await resolveClassificationAction(
        { descripcion: inc.descripcion, causa: inc.causa, solucion: inc.solucion },
        cat,
        sub,
        empresaId,
        period,
      );
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => {
          setShowEdit(false);
          setSaved(false);
        }, 1500);
      }
    });
  }

  return (
    <div className={styles.detailContent}>
      <div className={styles.detailGrid}>

        {/* Columna Izquierda: Informacion de Gestion */}
        <div className={styles.detailMeta}>
          <h4 className={styles.detailSectionTitle}>Detalles de Gestion</h4>

          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Estado</span>
            <span
              className={styles.estadoBadge}
              style={{
                color: estadoEstilo.color,
                borderColor: estadoEstilo.borderColor,
              }}
            >
              {inc.estado ?? "—"}
            </span>
          </div>

          <div className={styles.metaItem}>
            <div>
              <span className={styles.metaLabel}>Categoria / Subcategoria</span>
              <span className={styles.metaValue}>
                {categoria} {inc.subcategoria ? `· ${inc.subcategoria}` : ""}
              </span>
            </div>
          </div>

          <div className={styles.metaItem}>
            <UserIcon />
            <div>
              <span className={styles.metaLabel}>Solicitante</span>
              <span className={styles.metaValue}>{inc.solicitante ?? "No especificado"}</span>
            </div>
          </div>

          <div className={styles.metaItem}>
            <TechIcon />
            <div>
              <span className={styles.metaLabel}>Tecnico Asignado</span>
              <span className={styles.metaValue}>{inc.tecnico ?? "No asignado"}</span>
            </div>
          </div>

          <div className={styles.metaItem}>
            <WorkTypeIcon />
            <div>
              <span className={styles.metaLabel}>Tipo de Trabajo</span>
              <span className={styles.metaValue}>{inc.tipoTrabajo ?? "Correctivo"}</span>
            </div>
          </div>

          <div className={styles.metaItem}>
            <DeviceIcon />
            <div>
              <span className={styles.metaLabel}>Dispositivo</span>
              <span className={styles.metaValue}>
                {inc.articulo ?? "Impresora"}
                {inc.maquina && <span className={styles.serial}> (S/N: {inc.maquina})</span>}
              </span>
            </div>
          </div>

          <div className={styles.metaItem}>
            <CalendarIcon />
            <div>
              <span className={styles.metaLabel}>Fechas del Caso</span>
              <span className={styles.metaValue}>
                Apertura: {inc.fecha}
                {inc.fechaCierre && <span><br />Resolucion: {inc.fechaCierre}</span>}
              </span>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px dashed var(--border)" }}>
            {!showEdit ? (
              <button 
                type="button" 
                onClick={() => {
                  setCat(categoria === "Pendiente de revision" ? "" : categoria);
                  setSub(inc.subcategoria ?? "");
                  setShowEdit(true);
                }}
                className={styles.pageBtn} 
                style={{ width: "100%", fontSize: "0.85rem" }}
              >
                Corregir Tipificación
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <h5 style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-soft)", fontWeight: 600 }}>Nueva Tipificación</h5>
                <select className="select" value={cat} disabled={pending || saved} onChange={(e) => { setCat(e.target.value); setSub(""); }}>
                  <option value="">— Categoria —</option>
                  {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <select className="select" value={sub} disabled={pending || saved || !cat} onChange={(e) => setSub(e.target.value)}>
                  <option value="">— Subcategoria —</option>
                  {subsOf(cat).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.2rem" }}>
                  <button 
                    type="button" 
                    onClick={() => setShowEdit(false)} 
                    disabled={pending || saved}
                    className={styles.pageBtn}
                    style={{ flex: 1, padding: "0.4rem" }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    onClick={save} 
                    disabled={pending || saved || !cat || !sub}
                    style={{ 
                      flex: 1, 
                      padding: "0.4rem",
                      background: saved ? "var(--success)" : "var(--primary)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      fontWeight: 600,
                      cursor: (pending || saved || !cat || !sub) ? "not-allowed" : "pointer",
                      opacity: (pending || (!cat || !sub) && !saved) ? 0.7 : 1,
                      transition: "all 0.2s ease"
                    }}
                  >
                    {saved ? "Guardado ✓" : pending ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Trabajos Realizados y Reporte */}
        <div className={styles.detailSection}>
          <div className={styles.textBlock}>
            <h4 className={styles.detailSectionTitle}>Reporte del Cliente</h4>
            {renderClientReport(inc.descripcion)}
          </div>

          {inc.causa && (
            <div className={styles.textBlock}>
              <h4 className={styles.detailSectionTitle}>Causa Diagnosticada</h4>
              <p className={styles.causaText}>{inc.causa}</p>
            </div>
          )}

          <div className={styles.textBlock}>
            <h4 className={styles.detailSectionTitle}>Historial de Trabajos (Bitacora)</h4>
            {inc.trabajos && inc.trabajos.length > 0 ? (
              <div className={styles.timeline}>
                {inc.trabajos.map((trabajo, idx) => {
                  const hasTech = trabajo.tecnico && trabajo.tecnico !== "(Ninguno)";
                  const isLast = idx === inc.trabajos!.length - 1;
                  
                  return (
                    <div key={idx} className={styles.timelineItem}>
                      <div className={styles.timelineLine}></div>
                      <div className={styles.timelineBadge} style={{ 
                        background: isLast ? "var(--primary)" : "var(--border-strong)",
                        borderColor: isLast ? "var(--primary)" : "var(--border-strong)"
                      }}></div>
                      <div className={styles.timelineContent} style={{ width: "100%" }}>
                        <div style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "space-between",
                          flexWrap: "wrap", 
                          gap: "0.4rem",
                          marginBottom: "0.3rem"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ 
                              fontWeight: 700, 
                              fontSize: "0.85rem",
                              color: "var(--text)"
                            }}>
                              Instancia {idx + 1}
                            </span>
                            {trabajo.estado && (
                              <span style={{ 
                                fontSize: "0.7rem", 
                                fontWeight: 600,
                                padding: "0.05rem 0.35rem",
                                borderRadius: "4px",
                                border: "1px solid",
                                ...(() => {
                                  const est = trabajo.estado.toLowerCase();
                                  if (est === "finalizado" || est === "cerrado" || est === "resuelto") {
                                    return { color: "var(--success)", borderColor: "rgba(77, 194, 71, 0.3)", background: "rgba(77, 194, 71, 0.05)" };
                                  }
                                  if (est === "en curso" || est === "derivado") {
                                    return { color: "var(--primary)", borderColor: "rgba(1, 99, 184, 0.3)", background: "rgba(1, 99, 184, 0.05)" };
                                  }
                                  return { color: "var(--text-soft)", borderColor: "var(--border)", background: "var(--input-bg)" };
                                })()
                              }}>
                                {trabajo.estado}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", gap: "0.6rem" }}>
                            {trabajo.fecha && <span>{trabajo.fecha}</span>}
                            {hasTech && (
                              <>
                                <span>·</span>
                                <span style={{ fontWeight: 500, color: "var(--text-soft)" }}>
                                  Téc: {trabajo.tecnico}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Tareas Realizadas (si las hay) */}
                        {trabajo.descripcion ? (
                          <p className={styles.timelineDesc} style={{ margin: 0, fontWeight: 500, color: "var(--text)" }}>
                            {trabajo.descripcion}
                          </p>
                        ) : (
                          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                            Sin tareas registradas en esta instancia
                          </p>
                        )}
                        
                        {/* Observaciones (si las hay) */}
                        {trabajo.observ && trabajo.observ.trim() && (
                          <span className={styles.timelineObserv} style={{ display: "block", marginTop: "0.2rem", fontSize: "0.8rem" }}>
                            <strong>Obs:</strong> {trabajo.observ}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.fallbackSolucion}>
                <p className={styles.fullText}>{solucion}</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
