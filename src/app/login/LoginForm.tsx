"use client";

import { useActionState } from "react";
import Image from "next/image";
import { loginAction, type LoginState } from "./actions";
import ThemeToggle from "@/components/ThemeToggle";
import styles from "./login.module.css";

const initial: LoginState = {};

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <div className={styles.wrap}>
      <div style={{ position: "absolute", top: "1.5rem", right: "2rem", zIndex: 50 }}>
        <ThemeToggle />
      </div>
      <div className={`glass ${styles.card} rise`}>
        <Image
          src="/logo_login.png"
          alt="Canal Directo"
          width={220}
          height={50}
          className={styles.logo}
          priority
        />
        <div className="brandLine" style={{ margin: "0.5rem 0 1.2rem" }} />
        <h1 className={styles.title}>Reportes de Incidentes</h1>


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
              Contrasena
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
            className={`btn btn-primary ${styles.submit}`}
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
