import type { AiUsage } from "@/lib/types";
import { config } from "@/lib/config";
import { formatInt, formatUsd } from "@/lib/format";
import styles from "./AiCostWidget.module.css";

export default function AiCostWidget({ usage }: { usage: AiUsage }) {
  const noKey = !config.ai.apiKey;

  return (
    <div className={`card ${styles.card} rise`}>
      <div className={styles.head}>
        <span className={styles.spark} aria-hidden>
          ◈
        </span>
        <div>
          <h3 className={styles.title}>Inversión en Análisis de IA</h3>
          <p className={styles.sub}>
            Tipificación automática · {config.ai.model}
          </p>
        </div>
      </div>

      <div className={styles.amount}>{formatUsd(usage.costUsd)}</div>

      <div className={styles.grid}>
        <Metric label="Tokens procesados" value={formatInt(usage.totalTokens)} />
        <Metric label="Llamadas" value={formatInt(usage.calls)} />
        <Metric label="Prompt" value={formatInt(usage.promptTokens)} />
        <Metric label="Respuesta" value={formatInt(usage.candidatesTokens)} />
      </div>

      {noKey ? (
        <p className={styles.note}>
          Modo heurístico (sin API key) · costo $0,00. Configurá GEMINI_API_KEY
          para clasificación con IA.
        </p>
      ) : (
        <p className={styles.note}>
          Tarifa: ${config.ai.priceInputPerM}/M in · ${config.ai.priceOutputPerM}
          /M out
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricValue}>{value}</span>
      <span className={styles.metricLabel}>{label}</span>
    </div>
  );
}
