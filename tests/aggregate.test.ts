import { describe, it, expect } from "vitest";
import { summarize } from "@/lib/aggregate";
import type { Incident, ReportData } from "@/lib/types";

let seq = 0;
function inc(partial: Partial<Incident>): Incident {
  seq += 1;
  return {
    id: String(seq),
    numero: String(seq),
    fecha: "2026-06-01",
    empresaId: "1001",
    empresaNombre: "ACME",
    descripcion: "caso",
    ...partial,
  };
}

function report(incidents: Incident[]): ReportData {
  return {
    empresa: { id: "1001", nombre: "ACME" },
    period: "2026-06",
    incidents,
    generatedAt: "2026-06-30T00:00:00.000Z",
    isMock: true,
    pending: 0,
  };
}

describe("summarize", () => {
  it("cuenta el total y rankea la categoría principal con su porcentaje", () => {
    const s = summarize(
      report([
        inc({ categoria: "Insumos y Tóner" }),
        inc({ categoria: "Insumos y Tóner" }),
        inc({ categoria: "Insumos y Tóner" }),
        inc({ categoria: "Conectividad y Red" }),
      ]),
    );

    expect(s.total).toBe(4);
    expect(s.topCategory).toBe("Insumos y Tóner");
    expect(s.topCategoryCount).toBe(3);
    expect(s.topCategoryPct).toBe(75);
  });

  it("excluye categorías sin incidentes y ordena de mayor a menor", () => {
    const s = summarize(
      report([
        inc({ categoria: "Conectividad y Red" }),
        inc({ categoria: "Insumos y Tóner" }),
        inc({ categoria: "Insumos y Tóner" }),
      ]),
    );

    expect(s.categories.every((c) => c.value > 0)).toBe(true);
    expect(s.categories[0]).toEqual({ name: "Insumos y Tóner", value: 2 });
    expect(s.categories.map((c) => c.value)).toEqual(
      [...s.categories.map((c) => c.value)].sort((a, b) => b - a),
    );
  });

  it("clasifica como 'Sin Clasificar' los incidentes sin categoría", () => {
    const s = summarize(report([inc({}), inc({})]));
    expect(s.topCategory).toBe("Sin Clasificar");
    expect(s.topCategoryCount).toBe(2);
  });

  it("arma la serie temporal por día ordenada ascendente", () => {
    const s = summarize(
      report([
        inc({ fecha: "2026-06-10" }),
        inc({ fecha: "2026-06-02" }),
        inc({ fecha: "2026-06-10" }),
      ]),
    );

    expect(s.timeline).toEqual([
      { date: "2026-06-02", value: 1 },
      { date: "2026-06-10", value: 2 },
    ]);
  });

  it("rankea sucursales y limita a las 6 principales", () => {
    const incidents = [
      ...Array.from({ length: 5 }, () => inc({ sucursal: "Central" })),
      ...Array.from({ length: 2 }, () => inc({ sucursal: "Norte" })),
      inc({ sucursal: "Sur" }),
      inc({ sucursal: "Este" }),
      inc({ sucursal: "Oeste" }),
      inc({ sucursal: "Depósito" }),
      inc({ sucursal: "Anexo" }), // 7ª sucursal: debe quedar fuera del top 6
    ];
    const s = summarize(report(incidents));

    expect(s.topSucursal).toBe("Central");
    expect(s.topSucursalCount).toBe(5);
    expect(s.sucursales).toHaveLength(6);
  });

  it("agrega subcategorías conservando su categoría padre", () => {
    const s = summarize(
      report([
        inc({ categoria: "Insumos y Tóner", subcategoria: "Tóner Defectuoso" }),
        inc({ categoria: "Insumos y Tóner", subcategoria: "Tóner Defectuoso" }),
        inc({ categoria: "Conectividad y Red", subcategoria: "Configuración IP / Red" }),
      ]),
    );

    const top = s.subcategories[0];
    expect(top).toEqual({
      name: "Tóner Defectuoso",
      value: 2,
      category: "Insumos y Tóner",
    });
  });

  it("usa 'Sin subcategorizar' cuando falta la subcategoría", () => {
    const s = summarize(report([inc({ categoria: "Insumos y Tóner" })]));
    expect(s.subcategories[0].name).toBe("Sin subcategorizar");
  });

  it("devuelve agregados neutros para un reporte vacío", () => {
    const s = summarize(report([]));
    expect(s.total).toBe(0);
    expect(s.topCategory).toBe("—");
    expect(s.topCategoryPct).toBe(0);
    expect(s.categories).toEqual([]);
    expect(s.timeline).toEqual([]);
    expect(s.sucursales).toEqual([]);
  });
});
