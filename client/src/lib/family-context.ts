let currentFamilySlug: string | null = null;

export function setCurrentFamilySlug(slug: string) {
  currentFamilySlug = slug;
}

export function getCurrentFamilySlug(): string | null {
  return currentFamilySlug;
}
