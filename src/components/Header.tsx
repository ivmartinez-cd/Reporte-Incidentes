import Image from "next/image";
import { logoutAction } from "@/app/dashboard/actions";
import styles from "./Header.module.css";

export default function Header({ user }: { user: string }) {
  return (
    <header className={`${styles.header} glass`}>
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
          <strong>Dashboard Ejecutivo</strong>
          <small>Reportes de Incidentes</small>
        </div>
      </div>

      <div className={styles.right}>
        <span className={styles.user}>
          <span className={styles.dot} /> {user}
        </span>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-ghost">
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
