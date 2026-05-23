export interface DashboardCard {
  id: string;
  formTemplateId: string;
  visible: boolean;
  sortOrder: number;
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
}
