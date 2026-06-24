"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Empresa } from "@/lib/types";
import styles from "./ClientPicker.module.css";

const RECENTS_KEY = "cd:recent-clients";
const MAX_RECENTS = 5;
const MAX_RESULTS = 50;

/** Quita acentos y pasa a minusculas para una busqueda tolerante. */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

interface Recent {
  id: string;
  nombre: string;
}

/**
 * Buscador de cliente accesible (patron combobox + listbox). Reemplaza el
 * dropdown de 464 items: filtra mientras se escribe, se maneja por teclado
 * (flechas / Enter / Esc) y recuerda los ultimos clientes elegidos.
 */
export default function ClientPicker({ empresas }: { empresas: Empresa[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [recents, setRecents] = useState<Recent[]>([]);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      if (raw) setRecents(JSON.parse(raw) as Recent[]);
    } catch {
      /* localStorage no disponible: sin recientes */
    }
  }, []);

  const results = useMemo(() => {
    const q = normalize(query);
    const list = q
      ? empresas.filter((e) => normalize(e.nombre).includes(q) || e.id.includes(q))
      : empresas;
    return list.slice(0, MAX_RESULTS);
  }, [query, empresas]);

  // Mantiene el item activo a la vista al navegar con el teclado.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(
      `#cp-opt-${active}`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function select(empresa: Empresa) {
    const next = [
      { id: empresa.id, nombre: empresa.nombre },
      ...recents.filter((r) => r.id !== empresa.id),
    ].slice(0, MAX_RECENTS);
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      /* sin persistencia: continua igual */
    }
    setNavigatingId(empresa.id);
    setOpen(false);
    startTransition(() => router.push(`/dashboard?empresa=${empresa.id}`));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = results[active];
      if (chosen) select(chosen);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const totalLabel = `${empresas.length} clientes disponibles`;
  const expanded = open && results.length > 0;

  return (
    <div className={styles.wrap}>
      {recents.length > 0 && (
        <div className={styles.recents}>
          <span className={styles.recentsLabel}>Recientes</span>
          <div className={styles.chips}>
            {recents.map((r) => {
              const emp = empresas.find((e) => e.id === r.id) ?? r;
              return (
                <button
                  key={r.id}
                  type="button"
                  className={styles.chip}
                  onClick={() => select(emp as Empresa)}
                  disabled={pending}
                >
                  {navigatingId === r.id && (
                    <span className={styles.chipSpinner} aria-hidden />
                  )}
                  {r.nombre}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.comboField}>
        <span className={styles.searchIcon} aria-hidden>
          🔍
        </span>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="Buscar cliente por nombre o ID…"
          value={query}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={expanded}
          aria-controls="cp-listbox"
          aria-autocomplete="list"
          aria-activedescendant={expanded ? `cp-opt-${active}` : undefined}
          aria-label="Buscar cliente"
          disabled={pending}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {pending && <span className={styles.fieldSpinner} aria-hidden />}
      </div>

      <p className={styles.hint} aria-live="polite">
        {query
          ? `${results.length}${
              results.length === MAX_RESULTS ? "+" : ""
            } coincidencia${results.length === 1 ? "" : "s"}`
          : totalLabel}
      </p>

      {expanded && (
        <ul
          ref={listRef}
          id="cp-listbox"
          role="listbox"
          aria-label="Resultados de clientes"
          className={styles.listbox}
        >
          {results.map((e, i) => (
            <li
              key={e.id}
              id={`cp-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className={`${styles.option} ${
                i === active ? styles.optionActive : ""
              }`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(ev) => {
                ev.preventDefault(); // evita blur antes del click
                select(e);
              }}
            >
              <span className={styles.optionName}>{e.nombre}</span>
              <span className={styles.optionId}>#{e.id}</span>
            </li>
          ))}
        </ul>
      )}

      {open && query && results.length === 0 && (
        <p className={styles.empty}>
          Sin resultados para “{query}”. Proba con otro nombre o ID.
        </p>
      )}
    </div>
  );
}
