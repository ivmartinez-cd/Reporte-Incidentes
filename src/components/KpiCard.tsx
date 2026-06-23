import styles from "./KpiCard.module.css";

export default function KpiCard({
  label,
  value,
  hint,
  accent = "primary",
  delay = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "primary" | "accent" | "success" | "danger";
  delay?: number;
}) {
  return (
    <div
      className={`card ${styles.card} ${styles[accent]} rise`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className={styles.label}>{label}</span>
      <strong className={styles.value}>{value}</strong>
      {hint && <span className={styles.hint}>{hint}</span>}
      <span className={styles.glow} aria-hidden />
    </div>
  );
}
