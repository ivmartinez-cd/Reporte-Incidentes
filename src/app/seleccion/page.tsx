import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getEmpresas } from "@/lib/report";
import Header from "@/components/Header";
import ClientPicker from "@/components/ClientPicker";
import styles from "./seleccion.module.css";

// La lista de clientes se cachea aguas abajo; el resto es estatico.
export const dynamic = "force-dynamic";

export default async function SeleccionPage() {
  // Validacion criptografica real de la sesion (el middleware solo redirige).
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const empresas = await getEmpresas();

  return (
    <>
      <Header user={user} />
      <main className={styles.main}>
        <section className={`card ${styles.hero} rise`}>
          <p className={styles.kicker}>Reportes de Incidentes · Canal Directo</p>
          <h1 className={styles.title}>¿Que cliente queres analizar?</h1>
          <p className={styles.lead}>
            Elegi un cliente para generar su reporte de incidentes del periodo.
          </p>
          <ClientPicker empresas={empresas} />
        </section>
      </main>
    </>
  );
}
