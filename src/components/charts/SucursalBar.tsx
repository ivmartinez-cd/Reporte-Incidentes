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
import { formatInt } from "@/lib/format";
import styles from "./charts.module.css";

interface Datum {
  name: string;
  value: number;
}

const BAR_COLORS = ["#0275d8", "#014c8c", "#f0a400", "#4dc247", "#2bb6c4", "#7b61ff"];

export default function SucursalBar({ data }: { data: Datum[] }) {
  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.head}>
        <h3 className={styles.title}>Incidentes por Sucursal</h3>
        <span className={styles.meta}>Top {data.length}</span>
      </div>

      {data.length === 0 ? (
        <div className={styles.empty}>Sin datos para el período</div>
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
                stroke="rgba(255,255,255,0.06)"
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
                width={110}
                tick={{ fill: "var(--text-soft)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                content={<BarTooltip />}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                {data.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function BarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <strong>{label}</strong>
      <br />
      {formatInt(payload[0].value)} incidentes
    </div>
  );
}
