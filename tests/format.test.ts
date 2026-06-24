import { describe, it, expect } from "vitest";
import {
  calcCheckDigit,
  recentPeriods,
  periodLabel,
  formatInt,
} from "@/lib/format";

describe("calcCheckDigit", () => {
  it("aplica ponderación EAN (3,1 alternados, mod 10)", () => {
    // dígitos 2026060001 → suma ponderada 25 → (10 - 25%10) % 10 = 5
    expect(calcCheckDigit("2026060001")).toBe("5");
  });

  it("ignora todo lo que no sea dígito", () => {
    expect(calcCheckDigit("INC-2026060001")).toBe("5");
  });

  it("devuelve cadena vacía si no hay dígitos", () => {
    expect(calcCheckDigit("")).toBe("");
    expect(calcCheckDigit("ABC-")).toBe("");
  });

  it("cierra el módulo a 0 cuando corresponde", () => {
    // dígitos cuya suma es múltiplo de 10 → verificador 0
    expect(calcCheckDigit("00")).toBe("0");
  });
});

describe("recentPeriods", () => {
  it("lista N períodos YYYY-MM hacia atrás desde la fecha base", () => {
    const from = new Date(2026, 5, 15); // junio 2026
    expect(recentPeriods(3, from)).toEqual(["2026-06", "2026-05", "2026-04"]);
  });

  it("cruza el cambio de año correctamente", () => {
    const from = new Date(2026, 0, 10); // enero 2026
    expect(recentPeriods(2, from)).toEqual(["2026-01", "2025-12"]);
  });
});

describe("periodLabel", () => {
  it("traduce YYYY-MM a 'Mes Año' en español", () => {
    expect(periodLabel("2026-06")).toBe("Junio 2026");
    expect(periodLabel("2025-12")).toBe("Diciembre 2025");
  });
});

describe("formatInt", () => {
  it("agrupa miles con separador es-AR", () => {
    expect(formatInt(1234567)).toBe("1.234.567");
    expect(formatInt(0)).toBe("0");
  });
});
