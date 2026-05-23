export interface StatCardConfig {
  id: string;
  slug: string;
  visible: boolean;
  sortOrder: number;
  displayNameAr: string | null;
  displayNameEn: string | null;
  logoUrl: string | null;
  metricLabel: string | null;
  metricValue: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateStatCardConfigInput {
  slug: string;
  visible?: boolean;
  sortOrder?: number;
  displayNameAr?: string | null;
  displayNameEn?: string | null;
  logoUrl?: string | null;
  metricLabel?: string | null;
  metricValue?: string | null;
}

export interface CreateStatCardConfigInput {
  slug: string;
  displayNameAr: string | null;
  displayNameEn: string | null;
  logoUrl?: string | null;
  metricLabel?: string | null;
  metricValue?: string | null;
  sortOrder: number;
}
