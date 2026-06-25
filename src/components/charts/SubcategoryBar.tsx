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
import { useReportNav } from "../reportNav";
import styles from "./charts.module.css";

interface Datum {
  name: string;
  value: number;
  category: string;
}

function SubcategoryTick({
  x,
  y,
  payload,
  isPrint,
  yAxisWidth = 160,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
  isPrint: boolean;
  yAxisWidth?: number;
}) {
  if (!payload) return null;
  const val = payload.value;
  
  // Calculate average character width and max characters that fit the yAxisWidth.
  // We leave a 12px margin on the left of YAxis to avoid clipping.
  const charWidth = isPrint ? 5.5 : 6.2;
  const maxChars = Math.floor((yAxisWidth - 12) / charWidth);
  const formatted = val.length > maxChars ? `${val.slice(0, Math.max(5, maxChars - 3))}...` : val;

  return (
    <text
      x={x}
      y={y}
      dy={4}
      fill="var(--text-soft)"
      fontSize={isPrint ? 9.8 : 11}
      textAnchor="end"
    >
      {formatted}
    </text>
  );
}

export default function SubcategoryBar({
  data,
  categoryColors,
  height,
  yAxisWidth = 160,
  isPrint = false,
}: {
  data: Datum[];
  categoryColors?: Record<string, string>;
  height?: number;
  yAxisWidth?: number;
  isPrint?: boolean;
}) {
  const { filters, toggle, pending } = useReportNav();
  const active = filters.subcategoria;
  const dim = (name: string) => (active && active !== name ? 0.28 : 1);

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.head}>
        <h3 className={styles.title}>Incidentes por Subcategoria</h3>
        <span className={styles.meta}>Top {data.length}</span>
      </div>

      {data.length === 0 ? (
        <div className={styles.empty}>Sin datos para el periodo</div>
      ) : (
        <div className={styles.body} style={height ? { height, minHeight: height, flex: "none" } : undefined}>
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
                width={yAxisWidth}
                tick={<SubcategoryTick isPrint={isPrint} yAxisWidth={yAxisWidth} />}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-hover, rgba(255,255,255,0.04))" }}
                content={<SubcategoryTooltip />}
              />
              <Bar
                dataKey="value"
                radius={[0, 6, 6, 0]}
                barSize={16}
                isAnimationActive={false}
                onClick={(d) => !pending && toggle("subcategoria", d.name)}
                className={styles.clickable}
              >
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={categoryColor(d.category, categoryColors)}
                    fillOpacity={dim(d.name)}
                  />
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
