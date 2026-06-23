import { CATEGORY_COLORS } from "@/lib/ai/categories";
import type { Incident } from "@/lib/types";
import { formatArs } from "@/lib/format";
import styles from "./IncidentsTable.module.css";

export default function IncidentsTable({
  incidents,
  limit = 50,
}: {
  incidents: Incident[];
  limit?: number;
}) {
  const rows = incidents.slice(0, limit);

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.head}>
        <h3 className={styles.title}>Detalle de Incidentes</h3>
        <span className={styles.meta}>
          Mostrando {rows.length} de {incidents.length}
        </span>
      </div>

      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Número</th>
              <th>Fecha</th>
              <th>Sucursal</th>
              <th>Descripción</th>
              <th>Tipificación IA</th>
              <th className={styles.right}>Costo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inc) => (
              <tr key={inc.id}>
                <td className={styles.mono}>{inc.numero}</td>
                <td className={styles.nowrap}>{inc.fecha}</td>
                <td>{inc.sucursal ?? "—"}</td>
                <td className={styles.desc} title={inc.descripcion}>
                  {inc.descripcion}
                </td>
                <td>
                  <span
                    className={styles.badge}
                    style={{
                      color: CATEGORY_COLORS[inc.categoria ?? "Sin Clasificar"],
                      borderColor:
                        CATEGORY_COLORS[inc.categoria ?? "Sin Clasificar"],
                    }}
                  >
                    {inc.categoria ?? "Sin Clasificar"}
                  </span>
                </td>
                <td className={`${styles.right} ${styles.mono}`}>
                  {inc.costo ? formatArs(inc.costo) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
