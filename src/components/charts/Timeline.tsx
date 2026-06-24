"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatInt } from "@/lib/format";
import styles from "./charts.module.css";

interface Datum {
  date: string; // YYYY-MM-DD
  value: number;
}

export default function Timeline({ data, height }: { data: Datum[]; height?: number }) {
  const view = data.map((d) => ({ ...d, day: d.date.slice(8) }));

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.head}>
        <h3 className={styles.title}>Evolucion Diaria del Mes</h3>
        <span className={styles.meta}>incidentes / dia</span>
      </div>

      {data.length === 0 ? (
        <div className={styles.empty}>Sin datos para el periodo</div>
      ) : (
        <div className={styles.body} style={height ? { height, minHeight: height, flex: "none" } : undefined}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={view} margin={{ left: -18, right: 12, top: 6 }}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={36}
              />
              <Tooltip content={<TimeTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#areaFill)"
                dot={false}
                activeDot={{ r: 4, fill: "var(--accent)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function TimeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { date: string } }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <strong>{payload[0].payload.date}</strong>
      <br />
      {formatInt(payload[0].value)} incidentes
    </div>
  );
}
