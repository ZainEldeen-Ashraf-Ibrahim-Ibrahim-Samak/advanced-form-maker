/**
 * User entity interface.
 * Domain layer — zero framework imports.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role: "admin" | "user";
  languagePreference: "en" | "ar";
  themePreference: "light" | "dark";
  emailVerified?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateUserInput = Pick<User, "email" | "name"> & {
  password: string;
  role?: "admin" | "user";
  languagePreference?: "en" | "ar";
  themePreference?: "light" | "dark";
};

export type UpdateUserInput = Partial<
  Pick<User, "name" | "languagePreference" | "themePreference">
>;
