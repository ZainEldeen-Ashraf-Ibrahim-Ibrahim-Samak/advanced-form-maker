export interface DashboardCard {
  id: string;
  formTemplateId: string;
  visible: boolean;
  sortOrder: number;
  displayNameAr: string | null;
  displayNameEn: string | null;
  logoUrl: string | null;
  metricLabel: string | null;
  metricValue: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDashboardCardInput {
  formTemplateId: string;
  visible?: boolean;
  sortOrder?: number;
}

export interface UpdateDashboardCardInput {
  formTemplateId: string;
  visible?: boolean;
  sortOrder?: number;
  displayNameAr?: string | null;
  displayNameEn?: string | null;
  logoUrl?: string | null;
  metricLabel?: string | null;
  metricValue?: string | null;
}
