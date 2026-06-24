"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { IncidentCategory } from "@/lib/types";
import { categoryColor } from "@/lib/ai/categories";
import { formatInt } from "@/lib/format";
import { useReportNav } from "../reportNav";
import styles from "./charts.module.css";

interface Datum {
  name: IncidentCategory;
  value: number;
}

export default function CategoryDonut({
  data,
  categoryColors,
  height,
}: {
  data: Datum[];
  categoryColors?: Record<string, string>;
  height?: number;
}) {
  const { filters, toggle, pending } = useReportNav();
  const active = filters.categoria;
  const total = data.reduce((s, d) => s + d.value, 0);

  // Atenua lo no seleccionado cuando hay un filtro de categoria activo.
  const dim = (name: string) => (active && active !== name ? 0.28 : 1);

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.head}>
        <h3 className={styles.title}>Incidentes por Categoria</h3>
        <span className={styles.meta}>{formatInt(total)} total</span>
      </div>

      {total === 0 ? (
        <div className={styles.empty}>Sin datos para el periodo</div>
      ) : (
        <>
          <div className={styles.centerWrap} style={height ? { height, minHeight: height, flex: "none" } : undefined}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="65%"
                  outerRadius="92%"
                  paddingAngle={3}
                  stroke="var(--surface-1)"
                  strokeWidth={2}
                  isAnimationActive={false}
                  onClick={(_, index) =>
                    !pending && toggle("categoria", data[index].name)
                  }
                  className={styles.clickable}
                >
                  {data.map((d) => (
                    <Cell
                      key={d.name}
                      fill={categoryColor(d.name, categoryColors)}
                      fillOpacity={dim(d.name)}
                    />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip total={total} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.center}>
              <div>
                <div className={styles.centerValue}>{formatInt(total)}</div>
                <div className={styles.centerLabel}>Incidentes</div>
              </div>
            </div>
          </div>

          <div className={styles.legendGrid}>
            {data.map((d) => {
              const color = categoryColor(d.name, categoryColors);
              const pct = total ? Math.round((d.value / total) * 100) : 0;
              const isActive = active === d.name;
              return (
                <button
                  key={d.name}
                  type="button"
                  disabled={pending}
                  onClick={() => toggle("categoria", d.name)}
                  className={`${styles.legendItemCard} ${styles.legendBtn} ${isActive ? styles.legendActive : ""}`}
                  style={{ opacity: dim(d.name) }}
                  title={isActive ? "Quitar filtro" : `Filtrar por ${d.name}`}
                >
                  <div className={styles.legendLeft}>
                    <span
                      className={styles.swatch}
                      style={{ background: color }}
                    />
                    <span className={styles.legendName}>{d.name}</span>
                  </div>
                  <span className={styles.legendValue}>
                    {d.value} <span className={styles.legendPct}>({pct}%)</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function DonutTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className={styles.tooltip}>
      <strong>{name}</strong>
      <br />
      {formatInt(value)} incidentes · {pct}%
    </div>
  );
}
