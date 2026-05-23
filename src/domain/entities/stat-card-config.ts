export interface StatCardConfig {
  id: string;
  slug: "total" | "pending" | "draft" | "viewed" | "needs_rewrite";
  visible: boolean;
  sortOrder: number;
  displayNameAr: string | null;
  displayNameEn: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateStatCardConfigInput {
  slug: string;
  visible?: boolean;
  sortOrder?: number;
  displayNameAr?: string | null;
  displayNameEn?: string | null;
}
