import { describe, it, expect } from "vitest";
import {
  filterOptions,
  sanitizeFilters,
  applyFilters,
  hasActiveFilters,
  dimensionValue,
  EMPTY_FILTERS,
} from "@/lib/filters";
import type { Incident } from "@/lib/types";

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

const sample: Incident[] = [
  inc({ sucursal: "Central", categoria: "Insumos y Tóner", subcategoria: "Tóner" }),
  inc({ sucursal: "Central", categoria: "Insumos y Tóner", subcategoria: "Tóner" }),
  inc({ sucursal: "Norte", categoria: "Conectividad y Red", subcategoria: "IP" }),
  inc({ sucursal: "Norte", categoria: undefined, subcategoria: undefined }),
];

describe("dimensionValue", () => {
  it("normaliza categoría ausente como 'Sin Clasificar'", () => {
    expect(dimensionValue(inc({}), "categoria")).toBe("Sin Clasificar");
  });
  it("normaliza subcategoría ausente como 'Sin subcategorizar'", () => {
    expect(dimensionValue(inc({}), "subcategoria")).toBe("Sin subcategorizar");
  });
});

describe("filterOptions", () => {
  it("cuenta valores por dimensión y ordena por frecuencia", () => {
    const o = filterOptions(sample);
    expect(o.sucursales).toEqual([
      { value: "Central", count: 2 },
      { value: "Norte", count: 2 },
    ]);
    expect(o.categorias[0]).toEqual({ value: "Insumos y Tóner", count: 2 });
  });

  it("agrupa lo ausente bajo 'Sin Clasificar' / 'Sin subcategorizar'", () => {
    const o = filterOptions(sample);
    expect(o.categorias).toContainEqual({ value: "Sin Clasificar", count: 1 });
    expect(o.subcategorias).toContainEqual({ value: "Sin subcategorizar", count: 1 });
  });
});

describe("sanitizeFilters", () => {
  it("conserva solo valores que existen entre las opciones del periodo", () => {
    const o = filterOptions(sample);
    const f = sanitizeFilters(
      { sucursal: "Central", categoria: "Inexistente", subcategoria: "Tóner" },
      o,
    );
    expect(f).toEqual({ sucursal: "Central", categoria: "", subcategoria: "Tóner" });
  });
});

describe("applyFilters", () => {
  it("sin filtros devuelve todo", () => {
    expect(applyFilters(sample, EMPTY_FILTERS)).toHaveLength(4);
  });

  it("combina filtros con AND", () => {
    const r = applyFilters(sample, {
      sucursal: "Central",
      categoria: "Insumos y Tóner",
      subcategoria: "Tóner",
    });
    expect(r).toHaveLength(2);
  });

  it("filtra 'Sin Clasificar' alcanzando incidentes sin categoría", () => {
    const r = applyFilters(sample, { ...EMPTY_FILTERS, categoria: "Sin Clasificar" });
    expect(r).toHaveLength(1);
    expect(r[0].categoria).toBeUndefined();
  });
});

describe("hasActiveFilters", () => {
  it("es false sin filtros y true con alguno", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, subcategoria: "Tóner" })).toBe(true);
  });
});
