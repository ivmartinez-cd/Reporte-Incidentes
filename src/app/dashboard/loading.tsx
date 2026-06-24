import Image from "next/image";
import styles from "./loading.module.css";

/**
 * Pantalla de carga del dashboard.
 * Diseno limpio: logo, spinner de marca y texto de estado.
 */
export default function DashboardLoading() {
  return (
    <div className={styles.screen} role="status" aria-busy="true">
      <div className={`${styles.panel} rise`}>
        <Image
          src="/logo_login.png"
          alt="Canal Directo"
          width={190}
          height={42}
          className={styles.logo}
          priority
        />

        <div className={styles.ring} aria-hidden>
          <span className={styles.ringCore} />
        </div>

        <h1 className={styles.title}>Generando el reporte</h1>
        <p className={styles.subtitle}>Procesando…</p>

        <span className={styles.srOnly}>
          Generando el reporte, por favor espera…
        </span>
      </div>
    </div>
  );
}
