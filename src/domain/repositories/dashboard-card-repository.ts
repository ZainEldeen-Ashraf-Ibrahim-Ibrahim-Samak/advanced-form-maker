import { DashboardCard, UpdateDashboardCardInput } from "@/domain/entities/dashboard-card";

export interface DashboardCardRepository {
  listAll(): Promise<DashboardCard[]>;
  updateMany(cards: UpdateDashboardCardInput[]): Promise<void>;
  createForForm(formId: string): Promise<DashboardCard>;
  deleteByFormId(formId: string): Promise<boolean>;
}
