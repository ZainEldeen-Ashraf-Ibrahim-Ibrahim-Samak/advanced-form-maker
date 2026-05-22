import { User, UpdateUserInput } from "@/domain/entities/user";

/**
 * User repository interface.
 * Domain layer — defines data access contract.
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithPassword(
    email: string
  ): Promise<(User & { password?: string }) | null>;
  updatePreferences(id: string, input: UpdateUserInput): Promise<User | null>;
}
