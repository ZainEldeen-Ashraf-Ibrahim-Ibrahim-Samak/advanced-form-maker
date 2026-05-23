import type { StatCardConfig, UpdateStatCardConfigInput, CreateStatCardConfigInput } from "../entities/stat-card-config";

export interface StatCardConfigRepository {
  listAll(): Promise<StatCardConfig[]>;
  seedDefaults(): Promise<void>;
  upsertMany(configs: UpdateStatCardConfigInput[]): Promise<void>;
  create(input: CreateStatCardConfigInput): Promise<StatCardConfig>;
  deleteBySlug(slug: string): Promise<void>;
}
