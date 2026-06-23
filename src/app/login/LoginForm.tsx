"use client";

import { useActionState } from "react";
import Image from "next/image";
import { loginAction, type LoginState } from "./actions";
import styles from "./login.module.css";

const initial: LoginState = {};

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <div className={styles.wrap}>
      <div className={`glass ${styles.card} rise`}>
        <Image
          src="/logo_login.png"
          alt="Canal Directo"
          width={220}
          height={50}
          className={styles.logo}
          priority
        />
        <h1 className={styles.title}>Dashboard Ejecutivo</h1>
        <p className={styles.subtitle}>
          Reportes de incidentes · Acceso restringido al Directorio
        </p>

        <form action={action}>
          <div className={styles.group}>
            <label className={styles.label} htmlFor="username">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              className="field"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className={styles.group}>
            <label className={styles.label} htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="field"
              autoComplete="current-password"
            />
          </div>

          {state.error && <p className={styles.error}>{state.error}</p>}

          <button
            type="submit"
            className={`btn btn-accent ${styles.submit}`}
            disabled={pending}
          >
            {pending ? "Verificando…" : "Ingresar"}
          </button>
        </form>

        <p className={styles.foot}>
          © {new Date().getFullYear()} Canal Directo · Uso interno
        </p>
      </div>
    </div>
  );
}
