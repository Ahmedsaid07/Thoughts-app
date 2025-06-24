import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // "admin" | "user"
  clinicId: integer("clinic_id").references(() => clinics.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url"),
  logoUrl: text("logo_url"),
  departments: text("departments").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const thoughts = pgTable("thoughts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull().default("general"),
  department: text("department"),
  authorId: integer("author_id").notNull().references(() => users.id),
  clinicId: integer("clinic_id").notNull().references(() => clinics.id),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by").references(() => users.id),
  editCount: integer("edit_count").default(0),
  lastEditedAt: timestamp("last_edited_at"),
  lastEditedBy: integer("last_edited_by").references(() => users.id),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const thoughtHistory = pgTable("thought_history", {
  id: serial("id").primaryKey(),
  thoughtId: integer("thought_id").notNull().references(() => thoughts.id),
  title: text("title"),
  content: text("content"),
  category: text("category"),
  department: text("department"),
  editedBy: integer("edited_by").notNull().references(() => users.id),
  editedAt: timestamp("edited_at").defaultNow(),
  changeType: text("change_type").notNull(), // "created" | "edited" | "deleted"
});

// Insert schemas
export const baseInsertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = baseInsertUserSchema.refine((data) => {
  if (data.username && data.username.length < 3) return false;
  if (data.email && !data.email.includes('@')) return false;
  if (data.password && data.password.length < 6) return false;
  return true;
}, {
  message: "Invalid user data: username must be at least 3 characters, email must be valid, password must be at least 6 characters"
});

export const insertClinicSchema = createInsertSchema(clinics).omit({
  id: true,
  createdAt: true,
});

export const baseInsertThoughtSchema = createInsertSchema(thoughts).omit({
  id: true,
  createdAt: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
  editCount: true,
  lastEditedAt: true,
  lastEditedBy: true,
});

export const insertThoughtSchema = baseInsertThoughtSchema;

export const insertThoughtHistorySchema = createInsertSchema(thoughtHistory).omit({
  id: true,
  editedAt: true,
});

export const setupAdminSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  clinicName: z.string().min(1, "Clinic name is required"),
  clinicUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertClinic = z.infer<typeof insertClinicSchema>;
export type Clinic = typeof clinics.$inferSelect;
export type InsertThought = z.infer<typeof insertThoughtSchema>;
export type Thought = typeof thoughts.$inferSelect;
export type InsertThoughtHistory = z.infer<typeof insertThoughtHistorySchema>;
export type ThoughtHistory = typeof thoughtHistory.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type SetupAdminData = z.infer<typeof setupAdminSchema>;

export type UserWithClinic = User & {
  clinic: Clinic | null;
};

export type ThoughtWithAuthor = Thought & {
  author: User;
  deletedByUser?: User | null;
  lastEditedByUser?: User | null;
};

export type ThoughtHistoryWithUser = ThoughtHistory & {
  editedByUser: User;
};
