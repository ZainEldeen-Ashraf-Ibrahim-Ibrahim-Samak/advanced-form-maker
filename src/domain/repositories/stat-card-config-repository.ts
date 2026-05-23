import type { StatCardConfig, UpdateStatCardConfigInput } from "../entities/stat-card-config";

export interface StatCardConfigRepository {
  listAll(): Promise<StatCardConfig[]>;
  seedDefaults(): Promise<void>;
  upsertMany(configs: UpdateStatCardConfigInput[]): Promise<void>;
}
