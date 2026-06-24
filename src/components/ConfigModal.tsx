"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import {
  getCategoriesAction,
  saveCategoryAction,
  deleteCategoryAction,
  getSuggestionsAction,
  acceptSuggestionAction,
  dismissSuggestionAction,
} from "@/app/dashboard/categoryActions";
import type { DynamicCategory } from "@/lib/data/categoriesStore";
import type { SubcategorySuggestion } from "@/lib/data/suggestionsStore";
import styles from "./ConfigModal.module.css";

interface ConfigModalProps {
  onClose: () => void;
}

export default function ConfigModal({ onClose }: ConfigModalProps) {
  const [categories, setCategories] = useState<DynamicCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estado de edicion/creacion
  const [selectedCategory, setSelectedCategory] = useState<DynamicCategory | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [oldName, setOldName] = useState<string>("");

  // Campos del formulario
  const [name, setName] = useState("");
  const [color, setColor] = useState("#0275d8");
  const [description, setDescription] = useState("");
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Estado del modal de confirmacion de borrado
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(null);

  // Bandeja de sugerencias de subcategorias propuestas por la IA
  const [suggestions, setSuggestions] = useState<SubcategorySuggestion[]>([]);

  const modalRef = useRef<HTMLDivElement>(null);

  // Cargar categorias y sugerencias al montar
  useEffect(() => {
    loadCategories();
    refreshSuggestions();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const list = await getCategoriesAction();
      setCategories(list);
    } catch (err) {
      setError("No se pudieron cargar las categorias.");
    } finally {
      setLoading(false);
    }
  };

  const refreshSuggestions = async () => {
    try {
      setSuggestions(await getSuggestionsAction());
    } catch {
      /* silencioso: la bandeja simplemente no se muestra */
    }
  };

  const handleAcceptSuggestion = async (categoria: string, name: string) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await acceptSuggestionAction(categoria, name);
      if (res.success) {
        setSuccess(`Subcategoria "${name}" agregada a "${categoria}".`);
        await loadCategories();
      } else {
        setError(res.error || "No se pudo agregar la subcategoria.");
      }
      await refreshSuggestions();
    } finally {
      setSaving(false);
    }
  };

  const handleDismissSuggestion = async (categoria: string, name: string) => {
    setSaving(true);
    try {
      await dismissSuggestionAction(categoria, name);
      await refreshSuggestions();
    } finally {
      setSaving(false);
    }
  };

  // Cerrar al hacer clic en el backdrop
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // Iniciar formulario de nueva categoria
  const handleCreateNew = () => {
    setSelectedCategory({
      name: "",
      color: "#0275d8",
      description: "",
      subcategories: [],
    });
    setIsEditing(true);
    setOldName("");
    setName("");
    setColor("#0275d8");
    setDescription("");
    setSubcategories([]);
    setTagInput("");
    setError(null);
    setSuccess(null);
  };

  // Cargar categoria para edicion
  const handleSelectCategory = (cat: DynamicCategory) => {
    setSelectedCategory(cat);
    setIsEditing(true);
    setOldName(cat.name);
    setName(cat.name);
    setColor(cat.color);
    setDescription(cat.description);
    setSubcategories([...cat.subcategories]);
    setTagInput("");
    setError(null);
    setSuccess(null);
  };

  // Manejar el tag editor (subcategorias)
  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    const val = tagInput.trim().replace(/,/g, "");
    if (val && !subcategories.some(s => s.toLowerCase() === val.toLowerCase())) {
      setSubcategories([...subcategories, val]);
      setTagInput("");
    }
  };

  const removeTag = (indexToRemove: number) => {
    setSubcategories(subcategories.filter((_, idx) => idx !== indexToRemove));
  };

  // Guardar categoria (Create/Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("El nombre de la categoria es obligatorio.");
      return;
    }
    if (!description.trim()) {
      setError("La descripcion para las pautas de IA es obligatoria.");
      return;
    }

    setSaving(true);
    const categoryData: DynamicCategory = {
      name: name.trim(),
      color,
      description: description.trim(),
      subcategories,
    };

    try {
      const res = await saveCategoryAction(categoryData, oldName || undefined);
      if (res.success) {
        setSuccess("Categoria guardada exitosamente. La IA ha sido reprogramada.");
        // Volver a cargar la lista
        const list = await getCategoriesAction();
        setCategories(list);
        
        // Actualizar el estado seleccionado para reflejar cambios
        setOldName(categoryData.name);
        // Si era creacion, marcarla como seleccionada ahora
        setSelectedCategory(categoryData);
      } else {
        setError(res.error || "Ocurrio un error al guardar.");
      }
    } catch (err) {
      setError("Error de red o del servidor al procesar la solicitud.");
    } finally {
      setSaving(false);
    }
  };

  // Confirmar y eliminar categoria
  const handleDeleteClick = (catName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar seleccionar para editar al pulsar borrar
    setConfirmDeleteName(catName);
  };

  const executeDelete = async () => {
    if (!confirmDeleteName) return;
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const res = await deleteCategoryAction(confirmDeleteName);
      if (res.success) {
        setSuccess(`Categoria "${confirmDeleteName}" eliminada correctamente.`);
        // Si la categoria borrada era la que estabamos editando, cerrar formulario
        if (selectedCategory && selectedCategory.name.toLowerCase() === confirmDeleteName.toLowerCase()) {
          setSelectedCategory(null);
          setIsEditing(false);
        }
        setConfirmDeleteName(null);
        // Recargar lista
        const list = await getCategoriesAction();
        setCategories(list);
      } else {
        setError(res.error || "Error al eliminar la categoria.");
      }
    } catch (err) {
      setError("Error al procesar la eliminacion.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      {/* Modal de confirmacion de borrado */}
      {confirmDeleteName && (
        <div className={styles.overlay} style={{ zIndex: 1100 }}>
          <div className={styles.confirmModal}>
            <h3 className={styles.confirmTitle}>¿Eliminar categoria?</h3>
            <p className={styles.confirmText}>
              ¿Estas seguro de que deseas eliminar la categoria <strong>"{confirmDeleteName}"</strong>? 
              <br />
              Los incidentes asignados a esta categoria se clasificaran como "Sin Clasificar" hasta el proximo analisis.
            </p>
            <div className={styles.confirmActions}>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => setConfirmDeleteName(null)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ background: "var(--danger)" }}
                onClick={executeDelete}
                disabled={saving}
              >
                {saving ? <span className={styles.spinner}></span> : null}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.modal} ref={modalRef}>
        <div className={styles.header}>
          <div className={styles.titleInfo}>
            <h2>Configuracion de Tipificacion</h2>
            <p>Define las categorias y subcategorias que la Inteligencia Artificial utilizara para analizar los casos</p>
          </div>
          <button 
            type="button" 
            className={styles.closeBtn} 
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {/* Columna Izquierda: Listado */}
          <div className={styles.listSection}>
            {suggestions.length > 0 && (
              <div className={styles.suggestBox}>
                <div className={styles.suggestHeader}>
                  <span className={styles.suggestTitle}>
                    Sugerencias de la IA ({suggestions.length})
                  </span>
                  <span className={styles.suggestHint}>
                    Subcategorias que la IA propuso y que aun no estan en la taxonomia
                  </span>
                </div>
                {suggestions.map((s) => (
                  <div key={`${s.categoria}|${s.name}`} className={styles.suggestRow}>
                    <div className={styles.suggestInfo}>
                      <span className={styles.suggestName}>{s.name}</span>
                      <span className={styles.suggestMeta}>
                        {s.categoria} · {s.count} caso{s.count === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className={styles.suggestActions}>
                      <button
                        type="button"
                        className={styles.suggestAccept}
                        onClick={() => handleAcceptSuggestion(s.categoria, s.name)}
                        disabled={saving}
                        title="Agregar a la taxonomia"
                      >
                        Agregar
                      </button>
                      <button
                        type="button"
                        className={styles.suggestDismiss}
                        onClick={() => handleDismissSuggestion(s.categoria, s.name)}
                        disabled={saving}
                        title="Descartar sugerencia"
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.listHeader}>
              <span className={styles.listTitle}>Categorias Activas ({categories.length})</span>
              <button 
                type="button" 
                className="btn btn-primary"
                style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                onClick={handleCreateNew}
              >
                + Nueva
              </button>
            </div>

            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.loadingSpinner}></div>
                <span>Cargando taxonomia...</span>
              </div>
            ) : (
              <div className={styles.listScroll}>
                {categories.map((cat) => {
                  const isActive = selectedCategory && selectedCategory.name.toLowerCase() === cat.name.toLowerCase();
                  return (
                    <div 
                      key={cat.name} 
                      className={`${styles.categoryCard} ${isActive ? styles.categoryCardActive : ""}`}
                      style={{ "--indicator-color": cat.color } as any}
                      onClick={() => handleSelectCategory(cat)}
                    >
                      <div className={styles.cardHead}>
                        <div className={styles.cardName}>
                          <span 
                            className={styles.colorDot} 
                            style={{ "--dot-color": cat.color } as any}
                          />
                          {cat.name}
                        </div>
                        <div className={styles.cardActions}>
                          <button 
                            type="button" 
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            title="Eliminar categoria"
                            onClick={(e) => handleDeleteClick(cat.name, e)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <p className={styles.cardDesc}>{cat.description}</p>
                      
                      {cat.subcategories.length > 0 && (
                        <div className={styles.cardSubcategories}>
                          {cat.subcategories.slice(0, 4).map((sub) => (
                            <span key={sub} className={styles.pill}>{sub}</span>
                          ))}
                          {cat.subcategories.length > 4 && (
                            <span className={styles.pill} style={{ opacity: 0.6 }}>
                              +{cat.subcategories.length - 4} mas
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Columna Derecha: Formulario */}
          <div className={styles.formSection}>
            <div className={styles.formHeader}>
              <span className={styles.formTitle}>
                {selectedCategory 
                  ? (oldName ? `Editar: ${oldName}` : "Nueva Categoria") 
                  : "Detalle de Categoria"
                }
              </span>
            </div>

            {isEditing && selectedCategory ? (
              <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                <div className={styles.formScroll}>
                  {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}
                  {success && <div className={`${styles.alert} ${styles.alertSuccess}`}>{success}</div>}

                  <div className={styles.formGroup}>
                    <label htmlFor="cat-name">Nombre de Categoria</label>
                    <input 
                      id="cat-name"
                      type="text" 
                      className={styles.formInput} 
                      placeholder="Ej: Impresion Movil"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={saving}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Color en Graficos y Tabla</label>
                    <div className={styles.colorPickerArea}>
                      <div className={styles.colorPickerBox} style={{ background: color }}>
                        <input 
                          type="color" 
                          className={styles.colorPickerInput}
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          disabled={saving}
                        />
                      </div>
                      <input 
                        type="text" 
                        className={`${styles.formInput} ${styles.colorHexInput}`}
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="#0275d8"
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="cat-desc">Pauta e Instrucciones para la IA (Gemini)</label>
                    <textarea 
                      id="cat-desc"
                      className={`${styles.formInput} ${styles.formTextarea}`} 
                      placeholder="Describe que tipo de incidentes pertenecen a esta categoria, que palabras clave buscar o en que soluciones tecnicas enfocarse..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={saving}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Subcategorias (Modelos de Falla)</label>
                    <div className={styles.tagEditor}>
                      {subcategories.map((sub, idx) => (
                        <span key={idx} className={styles.tagChip}>
                          {sub}
                          <button 
                            type="button" 
                            className={styles.tagRemoveBtn}
                            onClick={() => removeTag(idx)}
                            disabled={saving}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input 
                        type="text" 
                        className={styles.tagInput}
                        placeholder={subcategories.length === 0 ? "Escribe y pulsa Enter..." : ""}
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        onBlur={addTag}
                        disabled={saving}
                      />
                    </div>
                    <span className={styles.tagHelp}>
                      Presiona Enter o escribe una coma para agregar la subcategoria a la lista de opciones validas.
                    </span>
                  </div>
                </div>

                <div className={styles.formFooter}>
                  <button 
                    type="button" 
                    className="btn btn-ghost" 
                    onClick={() => {
                      setSelectedCategory(null);
                      setIsEditing(false);
                      setError(null);
                      setSuccess(null);
                    }}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? <span className={styles.spinner}></span> : null}
                    Guardar Cambios
                  </button>
                </div>
              </form>
            ) : (
              <div className={styles.emptyState}>
                <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p>Selecciona una categoria de la lista para editarla o presiona <strong>"+ Nueva"</strong> para agregar pautas adicionales para Gemini.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
