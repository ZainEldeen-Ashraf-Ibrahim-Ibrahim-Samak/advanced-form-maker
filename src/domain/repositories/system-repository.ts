/**
 * System repository interface.
 * Domain layer — defines data access contract for system-level operations like backup and restore.
 */
export interface SystemRepository {
  /**
   * Generates a complete backup of all system data.
   */
  generateBackup(): Promise<Record<string, any[]>>;

  /**
   * Restores the system data from a provided backup object.
   * Should ideally be executed within a transaction to guarantee data integrity.
   * @param data The backup JSON data containing collections and their documents.
   */
  restoreBackup(data: Record<string, any[]>): Promise<void>;
}
