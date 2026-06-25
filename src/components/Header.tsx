import Image from "next/image";
import { logoutAction } from "@/app/dashboard/actions";
import ThemeToggle from "./ThemeToggle";
import ConfigButton from "./ConfigButton";
import styles from "./Header.module.css";

export default function Header({ user }: { user: string }) {
  return (
    <header className={`${styles.header} no-print`}>
      <div className={styles.mainRow}>
        <div className={styles.brand}>
          <Image
            src="/logo_login.png"
            alt="Canal Directo"
            width={170}
            height={38}
            className={styles.logo}
            priority
          />
          <span className={styles.divider} />
          <div className={styles.titles}>
            <strong>Reportes de Incidentes</strong>
          </div>
        </div>

        <div className={styles.right}>
          <ConfigButton />
          <ThemeToggle />
          <span className={styles.user}>
            <span className={styles.dot} />
            {user}
          </span>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-ghost">
              Salir
            </button>
          </form>
        </div>
      </div>
      <div className={`brandLine ${styles.brandLine}`} />
    </header>
  );
}
