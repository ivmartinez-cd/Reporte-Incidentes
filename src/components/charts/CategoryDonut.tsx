"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CATEGORY_COLORS } from "@/lib/ai/categories";
import type { IncidentCategory } from "@/lib/types";
import { formatInt } from "@/lib/format";
import styles from "./charts.module.css";

interface Datum {
  name: IncidentCategory;
  value: number;
}

export default function CategoryDonut({ data }: { data: Datum[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.head}>
        <h3 className={styles.title}>Incidentes por Tipo (IA)</h3>
        <span className={styles.meta}>{formatInt(total)} total</span>
      </div>

      {total === 0 ? (
        <div className={styles.empty}>Sin datos para el período</div>
      ) : (
        <>
          <div className={styles.centerWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="92%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={CATEGORY_COLORS[d.name]} />
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

          <div className={styles.legend}>
            {data.map((d) => (
              <span key={d.name} className={styles.legendItem}>
                <span
                  className={styles.swatch}
                  style={{ background: CATEGORY_COLORS[d.name] }}
                />
                {d.name} · {d.value}
              </span>
            ))}
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
