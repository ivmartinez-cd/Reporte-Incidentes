"use server";

import { revalidatePath } from "next/cache";
import { getCategories, saveCategories, type DynamicCategory } from "@/lib/data/categoriesStore";
import {
  getSuggestions,
  removeSuggestion,
  type SubcategorySuggestion,
} from "@/lib/data/suggestionsStore";

export async function getCategoriesAction(): Promise<DynamicCategory[]> {
  return getCategories();
}

export async function saveCategoryAction(
  category: DynamicCategory,
  oldName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const categories = getCategories();
    
    // Validar nombre obligatorio
    if (!category.name.trim()) {
      return { success: false, error: "El nombre de la categoria es obligatorio." };
    }
    // Validar descripcion obligatoria
    if (!category.description.trim()) {
      return { success: false, error: "La descripcion para la guia de IA es obligatoria." };
    }

    if (oldName) {
      // Edicion
      const idx = categories.findIndex(c => c.name.toLowerCase() === oldName.toLowerCase());
      if (idx === -1) {
        return { success: false, error: "Categoria original no encontrada." };
      }
      // Validar duplicado de nombre si se cambio
      if (category.name.toLowerCase() !== oldName.toLowerCase()) {
        const dup = categories.some(c => c.name.toLowerCase() === category.name.toLowerCase());
        if (dup) {
          return { success: false, error: `Ya existe una categoria llamada "${category.name}".` };
        }
      }
      categories[idx] = category;
    } else {
      // Creacion
      const dup = categories.some(c => c.name.toLowerCase() === category.name.toLowerCase());
      if (dup) {
        return { success: false, error: `Ya existe una categoria llamada "${category.name}".` };
      }
      categories.push(category);
    }

    saveCategories(categories);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al guardar la categoria." };
  }
}

export async function deleteCategoryAction(
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const categories = getCategories();
    const filtered = categories.filter(c => c.name.toLowerCase() !== name.toLowerCase());
    
    if (filtered.length === categories.length) {
      return { success: false, error: "Categoria no encontrada." };
    }

    saveCategories(filtered);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al eliminar la categoria." };
  }
}

// ── Bandeja de sugerencias de subcategorias (propuestas por la IA) ──────────

export async function getSuggestionsAction(): Promise<SubcategorySuggestion[]> {
  return getSuggestions();
}

/** Aprueba una sugerencia: la agrega como subcategoria de su categoria. */
export async function acceptSuggestionAction(
  categoria: string,
  name: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const categories = getCategories();
    const idx = categories.findIndex((c) => c.name === categoria);
    if (idx === -1) {
      removeSuggestion(categoria, name);
      return { success: false, error: "La categoria ya no existe." };
    }
    const exists = categories[idx].subcategories.some(
      (s) => s.toLowerCase() === name.toLowerCase(),
    );
    if (!exists) categories[idx].subcategories.push(name);
    saveCategories(categories);
    removeSuggestion(categoria, name);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al aceptar la sugerencia." };
  }
}

/** Descarta una sugerencia sin agregarla. */
export async function dismissSuggestionAction(
  categoria: string,
  name: string,
): Promise<{ success: boolean }> {
  removeSuggestion(categoria, name);
  return { success: true };
}
