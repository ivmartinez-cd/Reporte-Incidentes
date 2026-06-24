"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { categoryColor } from "@/lib/ai/categories";
import { formatInt } from "@/lib/format";
import styles from "./charts.module.css";

interface Datum {
  name: string;
  value: number;
  category: string;
}

export default function SubcategoryBar({
  data,
  categoryColors,
}: {
  data: Datum[];
  categoryColors?: Record<string, string>;
}) {
  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.head}>
        <h3 className={styles.title}>Incidentes por Subcategoria</h3>
        <span className={styles.meta}>Top {data.length}</span>
      </div>

      {data.length === 0 ? (
        <div className={styles.empty}>Sin datos para el periodo</div>
      ) : (
        <div className={styles.body}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid
                horizontal={false}
                stroke="var(--border-muted, rgba(255,255,255,0.06))"
              />
              <XAxis
                type="number"
                tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fill: "var(--text-soft)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-hover, rgba(255,255,255,0.04))" }}
                content={<SubcategoryTooltip />}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                {data.map((d, i) => (
                  <Cell key={i} fill={categoryColor(d.category, categoryColors)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function SubcategoryTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: Datum }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <strong>{label}</strong>
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
        Categoria: {item.category}
      </div>
      <div style={{ marginTop: "4px" }}>
        {formatInt(payload[0].value)} incidentes
      </div>
    </div>
  );
}
