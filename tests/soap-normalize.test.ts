import { describe, it, expect, vi } from "vitest";
import {
  unwrapSoapValue,
  parseSoapJson,
  pick,
  unwrapRow,
  toIsoDate,
  isBlank,
} from "@/lib/soap/normalize";

describe("unwrapSoapValue", () => {
  it("devuelve el string directo tal cual", () => {
    expect(unwrapSoapValue('[{"a":1}]')).toBe('[{"a":1}]');
  });

  it("desenvuelve el wrapper { $value } (xsd:string RPC/encoded)", () => {
    expect(unwrapSoapValue({ attributes: { type: "xsd:string" }, $value: "payload" }))
      .toBe("payload");
  });

  it("desenvuelve claves de retorno conocidas de forma recursiva", () => {
    expect(unwrapSoapValue({ Respuesta: { $value: "x" } })).toBe("x");
    expect(unwrapSoapValue({ return: "y" })).toBe("y");
  });

  it("desenvuelve un único nombre de retorno (ignorando attributes)", () => {
    expect(unwrapSoapValue({ attributes: {}, soloUno: "z" })).toBe("z");
  });

  it("maneja nulos y primitivos", () => {
    expect(unwrapSoapValue(null)).toBe("");
    expect(unwrapSoapValue(undefined)).toBe("");
    expect(unwrapSoapValue(5)).toBe("5");
  });
});

describe("parseSoapJson", () => {
  it("parsea JSON válido", () => {
    expect(parseSoapJson('[{"id":"1"}]', [])).toEqual([{ id: "1" }]);
  });

  it("devuelve el fallback ante string vacío", () => {
    expect(parseSoapJson("   ", [])).toEqual([]);
  });

  it("devuelve el fallback (y avisa) ante JSON inválido", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(parseSoapJson("no-json", { ok: true })).toEqual({ ok: true });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("pick", () => {
  it("toma el primer valor no vacío y lo recorta", () => {
    expect(pick({ Nombre: "  ACME  " }, ["Nombre"])).toBe("ACME");
  });

  it("tolera variantes en minúscula y mayúscula de la clave", () => {
    expect(pick({ nombre: "x" }, ["Nombre"])).toBe("x");
    expect(pick({ NOMBRE: "y" }, ["Nombre"])).toBe("y");
  });

  it("salta valores en blanco y respeta el orden de candidatas", () => {
    expect(pick({ a: "   ", b: "2" }, ["a", "b"])).toBe("2");
  });

  it("devuelve undefined si ninguna clave aporta valor", () => {
    expect(pick({ a: "   " }, ["a", "b"])).toBeUndefined();
  });
});

describe("unwrapRow", () => {
  it("desanida la fila bajo su clave única", () => {
    expect(unwrapRow({ Incident: { id: "1" } }, "Incident")).toEqual({ id: "1" });
  });

  it("devuelve la fila intacta si la clave no existe o no es objeto", () => {
    expect(unwrapRow({ id: "1" }, "Incident")).toEqual({ id: "1" });
    expect(unwrapRow({ Incident: "plano" }, "Incident")).toEqual({ Incident: "plano" });
  });
});

describe("toIsoDate", () => {
  it("convierte DD/MM/YYYY [HH:MM:SS] a ISO YYYY-MM-DD", () => {
    expect(toIsoDate("23/06/2026 10:30:00")).toBe("2026-06-23");
    expect(toIsoDate("01/12/2025")).toBe("2025-12-01");
  });

  it("trata las fechas centinela 1900 como vacías", () => {
    expect(toIsoDate("01/01/1900")).toBe("");
    expect(toIsoDate("1900-01-01")).toBe("");
  });

  it("recorta una fecha ya en ISO y maneja vacíos", () => {
    expect(toIsoDate("2026-06-23T12:00:00Z")).toBe("2026-06-23");
    expect(toIsoDate(undefined)).toBe("");
    expect(toIsoDate("")).toBe("");
  });
});

describe("isBlank", () => {
  it("detecta los 'vacíos del servicio'", () => {
    expect(isBlank(undefined)).toBe(true);
    expect(isBlank(" ")).toBe(true);
    expect(isBlank("-")).toBe(true);
    expect(isBlank("  , . - ")).toBe(true);
  });

  it("reconoce contenido real", () => {
    expect(isBlank("abc")).toBe(false);
    expect(isBlank("0")).toBe(false);
  });
});
