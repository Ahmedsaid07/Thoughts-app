import { 
  users, 
  clinics, 
  thoughts,
  thoughtHistory,
  type User, 
  type InsertUser,
  type Clinic,
  type InsertClinic,
  type Thought,
  type ThoughtHistory,
  type InsertThought,
  type InsertThoughtHistory,
  type UserWithClinic,
  type ThoughtWithAuthor,
  type ThoughtHistoryWithUser
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserWithClinic(id: number): Promise<UserWithClinic | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getUsersByClinic(clinicId: number): Promise<User[]>;
  
  // Clinic operations
  getClinic(id: number): Promise<Clinic | undefined>;
  createClinic(clinic: InsertClinic): Promise<Clinic>;
  updateClinic(id: number, updates: Partial<InsertClinic>): Promise<Clinic | undefined>;
  deleteClinic(id: number): Promise<boolean>;
  getAllClinics(): Promise<Clinic[]>;
  
  // Thought operations
  createThought(thought: InsertThought, userId: number): Promise<Thought>;
  getThoughtsByClinic(clinicId: number, includeDeleted?: boolean, filters?: {
    startDate?: string;
    endDate?: string;
    userId?: number;
    department?: string;
    includeRead?: boolean;
  }): Promise<ThoughtWithAuthor[]>;
  getThought(id: number): Promise<Thought | undefined>;
  updateThought(id: number, updates: Partial<InsertThought>, userId: number): Promise<Thought | undefined>;
  deleteThought(id: number, userId: number): Promise<boolean>;
  getThoughtHistory(thoughtId: number): Promise<ThoughtHistoryWithUser[]>;
  getUnreadThoughtsCount(clinicId: number): Promise<number>;
  
  // Department operations
  getDepartmentsByClinic(clinicId: number): Promise<string[]>;
  addDepartmentToClinic(clinicId: number, department: string): Promise<boolean>;
  updateDepartmentInClinic(clinicId: number, oldDepartment: string, newDepartment: string): Promise<boolean>;
  removeDepartmentFromClinic(clinicId: number, department: string): Promise<boolean>;
  
  // System operations
  hasAnyUsers(): Promise<boolean>;
  setupFirstAdmin(data: { user: InsertUser; clinic: InsertClinic }): Promise<{ user: User; clinic: Clinic }>;
  
  // Notification operations
  markThoughtAsRead(thoughtId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clinics: Map<number, Clinic>;
  private thoughts: Map<number, Thought>;
  private thoughtHistory: Map<number, ThoughtHistory>;
  private currentUserId: number;
  private currentClinicId: number;
  private currentThoughtId: number;
  private currentHistoryId: number;

  constructor() {
    this.users = new Map();
    this.clinics = new Map();
    this.thoughts = new Map();
    this.thoughtHistory = new Map();
    this.currentUserId = 1;
    this.currentClinicId = 1;
    this.currentThoughtId = 1;
    this.currentHistoryId = 1;
  }

  // System operations
  async hasAnyUsers(): Promise<boolean> {
    return this.users.size > 0;
  }

  async setupFirstAdmin(data: { user: InsertUser; clinic: InsertClinic }): Promise<{ user: User; clinic: Clinic }> {
    // Create clinic first
    const clinic: Clinic = { 
      id: this.currentClinicId++, 
      name: data.clinic.name,
      url: data.clinic.url || null,
      logoUrl: data.clinic.logoUrl || null,
      departments: data.clinic.departments || ["General", "Administration"],
      createdAt: new Date() 
    };
    this.clinics.set(clinic.id, clinic);

    // Create admin user
    const user: User = { 
      id: this.currentUserId++, 
      ...data.user,
      role: "admin",
      clinicId: clinic.id,
      createdAt: new Date() 
    };
    this.users.set(user.id, user);

    return { user, clinic };
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserWithClinic(id: number): Promise<UserWithClinic | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const clinic = user.clinicId ? this.clinics.get(user.clinicId) : null;
    return { ...user, clinic: clinic || null };
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = { 
      id: this.currentUserId++, 
      username: insertUser.username,
      email: insertUser.email,
      password: insertUser.password,
      role: insertUser.role || "user",
      clinicId: insertUser.clinicId || null,
      createdAt: new Date() 
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async getUsersByClinic(clinicId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.clinicId === clinicId);
  }

  // Clinic operations
  async getClinic(id: number): Promise<Clinic | undefined> {
    return this.clinics.get(id);
  }

  async createClinic(insertClinic: InsertClinic): Promise<Clinic> {
    const clinic: Clinic = { 
      id: this.currentClinicId++, 
      name: insertClinic.name,
      url: insertClinic.url || null,
      logoUrl: insertClinic.logoUrl || null,
      departments: insertClinic.departments || ["General"],
      createdAt: new Date() 
    };
    this.clinics.set(clinic.id, clinic);
    return clinic;
  }

  async updateClinic(id: number, updates: Partial<InsertClinic>): Promise<Clinic | undefined> {
    const clinic = this.clinics.get(id);
    if (!clinic) return undefined;

    const updatedClinic = { ...clinic, ...updates };
    this.clinics.set(id, updatedClinic);
    return updatedClinic;
  }

  async deleteClinic(id: number): Promise<boolean> {
    return this.clinics.delete(id);
  }

  async getAllClinics(): Promise<Clinic[]> {
    return Array.from(this.clinics.values());
  }

  // Department operations
  async getDepartmentsByClinic(clinicId: number): Promise<string[]> {
    const clinic = this.clinics.get(clinicId);
    return clinic?.departments || ["General"];
  }

  async addDepartmentToClinic(clinicId: number, department: string): Promise<boolean> {
    const clinic = this.clinics.get(clinicId);
    if (!clinic) {
      console.log(`Clinic not found: ${clinicId}`);
      return false;
    }
    
    const trimmedDepartment = department.trim();
    if (!trimmedDepartment) {
      console.log(`Empty department name provided`);
      return false;
    }
    
    const departments = clinic.departments || [];
    const departmentExists = departments.some(d => d.toLowerCase() === trimmedDepartment.toLowerCase());
    
    if (departmentExists) {
      console.log(`Department already exists: ${trimmedDepartment}`);
      return false;
    }
    
    const updatedDepartments = [...departments, trimmedDepartment];
    const updatedClinic = {
      ...clinic,
      departments: updatedDepartments
    };
    
    this.clinics.set(clinicId, updatedClinic);
    console.log(`Added department "${trimmedDepartment}" to clinic ${clinicId}. New departments:`, updatedDepartments);
    return true;
  }

  async updateDepartmentInClinic(clinicId: number, oldDepartment: string, newDepartment: string): Promise<boolean> {
    const clinic = this.clinics.get(clinicId);
    if (!clinic) {
      console.log(`Clinic not found: ${clinicId}`);
      return false;
    }
    
    const trimmedOld = oldDepartment.trim();
    const trimmedNew = newDepartment.trim();
    
    if (!trimmedOld || !trimmedNew) {
      console.log(`Empty department names provided`);
      return false;
    }
    
    const departments = clinic.departments || [];
    const oldIndex = departments.findIndex(d => d.toLowerCase() === trimmedOld.toLowerCase());
    
    if (oldIndex === -1) {
      console.log(`Old department not found: ${trimmedOld}`);
      return false;
    }
    
    const newExists = departments.some((d, i) => i !== oldIndex && d.toLowerCase() === trimmedNew.toLowerCase());
    if (newExists) {
      console.log(`New department already exists: ${trimmedNew}`);
      return false;
    }
    
    const updatedDepartments = [...departments];
    updatedDepartments[oldIndex] = trimmedNew;
    
    // Update thoughts that use the old department name
    for (const [thoughtId, thought] of Array.from(this.thoughts.entries())) {
      if (thought.department === departments[oldIndex] && thought.clinicId === clinicId) {
        this.thoughts.set(thoughtId, {
          ...thought,
          department: trimmedNew
        });
      }
    }
    
    const updatedClinic = {
      ...clinic,
      departments: updatedDepartments
    };
    
    this.clinics.set(clinicId, updatedClinic);
    console.log(`Updated department "${departments[oldIndex]}" to "${trimmedNew}" in clinic ${clinicId}`);
    return true;
  }

  async removeDepartmentFromClinic(clinicId: number, department: string): Promise<boolean> {
    const clinic = this.clinics.get(clinicId);
    if (!clinic) {
      console.log(`Clinic not found: ${clinicId}`);
      return false;
    }
    
    const trimmedDepartment = department.trim();
    if (!trimmedDepartment) {
      console.log(`Empty department name provided`);
      return false;
    }
    
    const departments = clinic.departments || [];
    const index = departments.findIndex(d => d.toLowerCase() === trimmedDepartment.toLowerCase());
    
    if (index === -1) {
      console.log(`Department not found: ${trimmedDepartment}`);
      return false;
    }
    
    // Don't allow deleting the last department
    if (departments.length <= 1) {
      console.log(`Cannot delete last department: ${trimmedDepartment}`);
      return false;
    }
    
    const departmentToRemove = departments[index];
    const updatedDepartments = departments.filter((_, i) => i !== index);
    
    // Update thoughts that use this department
    for (const [thoughtId, thought] of Array.from(this.thoughts.entries())) {
      if (thought.department === departmentToRemove && thought.clinicId === clinicId) {
        this.thoughts.set(thoughtId, {
          ...thought,
          department: updatedDepartments[0] || "General"
        });
      }
    }
    
    const updatedClinic = {
      ...clinic,
      departments: updatedDepartments
    };
    
    this.clinics.set(clinicId, updatedClinic);
    console.log(`Removed department "${departmentToRemove}" from clinic ${clinicId}. Remaining departments:`, updatedDepartments);
    return true;
  }

  // Thought operations
  async createThought(insertThought: InsertThought, userId: number): Promise<Thought> {
    const thought: Thought = { 
      id: this.currentThoughtId++, 
      clinicId: insertThought.clinicId,
      title: insertThought.title,
      content: insertThought.content,
      category: insertThought.category || "General",
      department: insertThought.department || null,
      authorId: insertThought.authorId,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      editCount: 0,
      lastEditedAt: null,
      lastEditedBy: null,
      isRead: false,
      readAt: null,
      createdAt: new Date() 
    };
    this.thoughts.set(thought.id, thought);

    // Create history entry
    await this.createHistoryEntry(thought.id, thought, userId, "created");

    return thought;
  }

  async getThoughtsByClinic(clinicId: number, includeDeleted = false, filters?: {
    startDate?: string;
    endDate?: string;
    userId?: number;
    department?: string;
    includeRead?: boolean;
  }): Promise<ThoughtWithAuthor[]> {
    let thoughtsArray = Array.from(this.thoughts.values())
      .filter(thought => thought.clinicId === clinicId)
      .filter(thought => includeDeleted || !thought.isDeleted);

    // Apply filters
    if (filters) {
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        thoughtsArray = thoughtsArray.filter(thought => 
          new Date(thought.createdAt || 0) >= startDate
        );
      }
      
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // Include full end day
        thoughtsArray = thoughtsArray.filter(thought => 
          new Date(thought.createdAt || 0) <= endDate
        );
      }
      
      if (filters.userId) {
        thoughtsArray = thoughtsArray.filter(thought => 
          thought.authorId === filters.userId
        );
      }
      
      if (filters.department) {
        thoughtsArray = thoughtsArray.filter(thought => 
          thought.department === filters.department
        );
      }
      
      if (filters.includeRead === false) {
        thoughtsArray = thoughtsArray.filter(thought => !thought.isRead);
      }
    }

    const thoughtsWithAuthors: ThoughtWithAuthor[] = [];
    
    for (const thought of thoughtsArray) {
      const author = this.users.get(thought.authorId);
      const deletedByUser = thought.deletedBy ? this.users.get(thought.deletedBy) : null;
      const lastEditedByUser = thought.lastEditedBy ? this.users.get(thought.lastEditedBy) : null;
      
      if (author) {
        thoughtsWithAuthors.push({
          ...thought,
          author,
          deletedByUser: deletedByUser || null,
          lastEditedByUser: lastEditedByUser || null,
        });
      }
    }
    
    return thoughtsWithAuthors.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getThought(id: number): Promise<Thought | undefined> {
    return this.thoughts.get(id);
  }

  async updateThought(id: number, updates: Partial<InsertThought>, userId: number): Promise<Thought | undefined> {
    const thought = this.thoughts.get(id);
    if (!thought) return undefined;

    const updatedThought: Thought = {
      ...thought,
      ...updates,
      editCount: (thought.editCount || 0) + 1,
      lastEditedAt: new Date(),
      lastEditedBy: userId,
    };
    
    this.thoughts.set(id, updatedThought);

    // Create history entry
    await this.createHistoryEntry(id, updatedThought, userId, "edited");

    return updatedThought;
  }

  async deleteThought(id: number, userId: number): Promise<boolean> {
    const thought = this.thoughts.get(id);
    if (!thought) return false;

    const deletedThought: Thought = {
      ...thought,
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
    };
    
    this.thoughts.set(id, deletedThought);

    // Create history entry
    await this.createHistoryEntry(id, deletedThought, userId, "deleted");

    return true;
  }

  async getThoughtHistory(thoughtId: number): Promise<ThoughtHistoryWithUser[]> {
    const historyEntries = Array.from(this.thoughtHistory.values())
      .filter(entry => entry.thoughtId === thoughtId)
      .sort((a, b) => new Date(b.editedAt || 0).getTime() - new Date(a.editedAt || 0).getTime());

    const result: ThoughtHistoryWithUser[] = [];
    
    // Add all historical entries with proper user information
    for (const entry of historyEntries) {
      const editedByUser = this.users.get(entry.editedBy);
      console.log(`Looking up user ${entry.editedBy} for history entry ${entry.id}, found:`, editedByUser?.username);
      
      result.push({
        ...entry,
        editedByUser: editedByUser || { 
          id: entry.editedBy, 
          username: `Unknown User ${entry.editedBy}`, 
          email: 'unknown@example.com', 
          password: '',
          role: 'user', 
          clinicId: null,
          createdAt: null
        }
      });
    }

    // If no history exists, create entry from current thought
    if (result.length === 0) {
      const currentThought = this.thoughts.get(thoughtId);
      if (currentThought) {
        const currentUser = this.users.get(currentThought.authorId);
        console.log(`Creating history from current thought, author ${currentThought.authorId}, found user:`, currentUser?.username);
        
        result.push({
          id: Date.now(),
          thoughtId,
          title: currentThought.title,
          content: currentThought.content,
          category: currentThought.category,
          department: currentThought.department,
          changeType: "created",
          editedAt: currentThought.createdAt,
          editedBy: currentThought.authorId,
          editedByUser: currentUser || { 
            id: currentThought.authorId, 
            username: `Unknown User ${currentThought.authorId}`, 
            email: 'unknown@example.com', 
            password: '',
            role: 'user', 
            clinicId: null,
            createdAt: null
          }
        });
      }
    }

    console.log(`Returning ${result.length} history entries for thought ${thoughtId}`);
    return result;
  }

  private async createHistoryEntry(
    thoughtId: number, 
    thought: Thought, 
    userId: number, 
    changeType: "created" | "edited" | "deleted"
  ): Promise<void> {
    const historyEntry: ThoughtHistory = {
      id: this.currentHistoryId++,
      thoughtId,
      title: thought.title,
      content: thought.content,
      category: thought.category,
      department: thought.department,
      editedBy: userId,
      editedAt: new Date(),
      changeType,
    };
    
    this.thoughtHistory.set(historyEntry.id, historyEntry);
  }

  async markThoughtAsRead(thoughtId: number): Promise<boolean> {
    const thought = this.thoughts.get(thoughtId);
    if (!thought) return false;

    const updatedThought: Thought = {
      ...thought,
      isRead: true,
      readAt: new Date(),
    };
    
    this.thoughts.set(thoughtId, updatedThought);
    return true;
  }

  async getUnreadThoughtsCount(clinicId: number): Promise<number> {
    return Array.from(this.thoughts.values())
      .filter(thought => 
        thought.clinicId === clinicId && 
        !thought.isDeleted && 
        !thought.isRead
      ).length;
  }
}

// Initialize PostgreSQL storage
class PostgreSQLStorage implements IStorage {
  private db: any;
  
  constructor() {
    const sql = neon(process.env.DATABASE_URL!);
    this.db = drizzle(sql);
  }

  async hasAnyUsers(): Promise<boolean> {
    const result = await this.db.select().from(users).limit(1);
    return result.length > 0;
  }

  async setupFirstAdmin(data: { user: InsertUser; clinic: InsertClinic }): Promise<{ user: User; clinic: Clinic }> {
    // Create clinic first
    const [clinic] = await this.db.insert(clinics).values(data.clinic).returning();
    
    // Create admin user
    const [user] = await this.db.insert(users).values({
      ...data.user,
      clinicId: clinic.id,
    }).returning();

    return { user, clinic };
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserWithClinic(id: number): Promise<UserWithClinic | undefined> {
    const result = await this.db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      password: users.password,
      role: users.role,
      clinicId: users.clinicId,
      createdAt: users.createdAt,
      clinic: clinics
    }).from(users).leftJoin(clinics, eq(users.clinicId, clinics.id)).where(eq(users.id, id)).limit(1);
    
    return result[0] ? {
      ...result[0],
      clinic: result[0].clinic || null
    } : undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await this.db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await this.db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await this.db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getUsersByClinic(clinicId: number): Promise<User[]> {
    return await this.db.select().from(users).where(eq(users.clinicId, clinicId));
  }

  async getClinic(id: number): Promise<Clinic | undefined> {
    const result = await this.db.select().from(clinics).where(eq(clinics.id, id)).limit(1);
    return result[0];
  }

  async createClinic(clinic: InsertClinic): Promise<Clinic> {
    const [newClinic] = await this.db.insert(clinics).values(clinic).returning();
    return newClinic;
  }

  async updateClinic(id: number, updates: Partial<InsertClinic>): Promise<Clinic | undefined> {
    const [updatedClinic] = await this.db.update(clinics).set(updates).where(eq(clinics.id, id)).returning();
    return updatedClinic;
  }

  async deleteClinic(id: number): Promise<boolean> {
    const result = await this.db.delete(clinics).where(eq(clinics.id, id)).returning();
    return result.length > 0;
  }

  async getAllClinics(): Promise<Clinic[]> {
    return await this.db.select().from(clinics);
  }

  async getDepartmentsByClinic(clinicId: number): Promise<string[]> {
    const clinic = await this.getClinic(clinicId);
    return clinic?.departments || [];
  }

  async addDepartmentToClinic(clinicId: number, department: string): Promise<boolean> {
    const clinic = await this.getClinic(clinicId);
    if (!clinic) return false;
    
    const currentDepts = clinic.departments || [];
    if (currentDepts.includes(department)) return false;
    
    const updatedDepts = [...currentDepts, department];
    const result = await this.updateClinic(clinicId, { departments: updatedDepts });
    return !!result;
  }

  async updateDepartmentInClinic(clinicId: number, oldDepartment: string, newDepartment: string): Promise<boolean> {
    const clinic = await this.getClinic(clinicId);
    if (!clinic) return false;
    
    const currentDepts = clinic.departments || [];
    const index = currentDepts.indexOf(oldDepartment);
    if (index === -1 || currentDepts.includes(newDepartment)) return false;
    
    const updatedDepts = [...currentDepts];
    updatedDepts[index] = newDepartment;
    const result = await this.updateClinic(clinicId, { departments: updatedDepts });
    return !!result;
  }

  async removeDepartmentFromClinic(clinicId: number, department: string): Promise<boolean> {
    const clinic = await this.getClinic(clinicId);
    if (!clinic) return false;
    
    const currentDepts = clinic.departments || [];
    if (currentDepts.length <= 1) return false; // Don't allow removing last department
    
    const updatedDepts = currentDepts.filter(d => d !== department);
    const result = await this.updateClinic(clinicId, { departments: updatedDepts });
    return !!result;
  }

  async createThought(thought: InsertThought, userId: number): Promise<Thought> {
    const [newThought] = await this.db.insert(thoughts).values(thought).returning();
    
    // Create history entry
    await this.db.insert(thoughtHistory).values({
      thoughtId: newThought.id,
      title: newThought.title,
      content: newThought.content,
      category: newThought.category,
      department: newThought.department,
      editedBy: userId,
      changeType: "created"
    });
    
    return newThought;
  }

  async getThoughtsByClinic(clinicId: number, includeDeleted = false, filters?: {
    startDate?: string;
    endDate?: string;
    userId?: number;
    department?: string;
    includeRead?: boolean;
  }): Promise<ThoughtWithAuthor[]> {
    let query = this.db.select({
      id: thoughts.id,
      title: thoughts.title,
      content: thoughts.content,
      category: thoughts.category,
      department: thoughts.department,
      authorId: thoughts.authorId,
      clinicId: thoughts.clinicId,
      isDeleted: thoughts.isDeleted,
      deletedAt: thoughts.deletedAt,
      deletedBy: thoughts.deletedBy,
      editCount: thoughts.editCount,
      lastEditedAt: thoughts.lastEditedAt,
      lastEditedBy: thoughts.lastEditedBy,
      isRead: thoughts.isRead,
      readAt: thoughts.readAt,
      createdAt: thoughts.createdAt,
      author: {
        id: users.id,
        username: users.username,
        email: users.email,
        password: users.password,
        role: users.role,
        clinicId: users.clinicId,
        createdAt: users.createdAt
      }
    }).from(thoughts).innerJoin(users, eq(thoughts.authorId, users.id));

    // Apply filters
    let conditions = [eq(thoughts.clinicId, clinicId)];
    
    if (!includeDeleted) {
      conditions.push(eq(thoughts.isDeleted, false));
    }
    
    if (filters?.userId) {
      conditions.push(eq(thoughts.authorId, filters.userId));
    }
    
    if (filters?.department) {
      conditions.push(eq(thoughts.department, filters.department));
    }
    
    if (filters?.includeRead === false) {
      conditions.push(eq(thoughts.isRead, false));
    }

    const result = await query.where(and(...conditions)).orderBy(desc(thoughts.createdAt));
    
    return result.map(row => ({
      ...row,
      deletedByUser: null, // Would need additional joins to get deleted by user
      lastEditedByUser: null // Would need additional joins to get last edited by user
    }));
  }

  async getThought(id: number): Promise<Thought | undefined> {
    const result = await this.db.select().from(thoughts).where(eq(thoughts.id, id)).limit(1);
    return result[0];
  }

  async updateThought(id: number, updates: Partial<InsertThought>, userId: number): Promise<Thought | undefined> {
    const thought = await this.getThought(id);
    if (!thought) return undefined;

    const [updatedThought] = await this.db.update(thoughts).set({
      ...updates,
      editCount: (thought.editCount || 0) + 1,
      lastEditedAt: new Date(),
      lastEditedBy: userId
    }).where(eq(thoughts.id, id)).returning();

    // Create history entry
    await this.db.insert(thoughtHistory).values({
      thoughtId: id,
      title: updatedThought.title,
      content: updatedThought.content,
      category: updatedThought.category,
      department: updatedThought.department,
      editedBy: userId,
      changeType: "edited"
    });

    return updatedThought;
  }

  async deleteThought(id: number, userId: number): Promise<boolean> {
    const thought = await this.getThought(id);
    if (!thought) return false;

    const [deletedThought] = await this.db.update(thoughts).set({
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId
    }).where(eq(thoughts.id, id)).returning();

    // Create history entry
    await this.db.insert(thoughtHistory).values({
      thoughtId: id,
      title: deletedThought.title,
      content: deletedThought.content,
      category: deletedThought.category,
      department: deletedThought.department,
      editedBy: userId,
      changeType: "deleted"
    });

    return true;
  }

  async getThoughtHistory(thoughtId: number): Promise<ThoughtHistoryWithUser[]> {
    const result = await this.db.select({
      id: thoughtHistory.id,
      thoughtId: thoughtHistory.thoughtId,
      title: thoughtHistory.title,
      content: thoughtHistory.content,
      category: thoughtHistory.category,
      department: thoughtHistory.department,
      editedBy: thoughtHistory.editedBy,
      editedAt: thoughtHistory.editedAt,
      changeType: thoughtHistory.changeType,
      editedByUser: {
        id: users.id,
        username: users.username,
        email: users.email,
        password: users.password,
        role: users.role,
        clinicId: users.clinicId,
        createdAt: users.createdAt
      }
    }).from(thoughtHistory).innerJoin(users, eq(thoughtHistory.editedBy, users.id))
      .where(eq(thoughtHistory.thoughtId, thoughtId))
      .orderBy(desc(thoughtHistory.editedAt));

    return result;
  }

  async markThoughtAsRead(thoughtId: number): Promise<boolean> {
    const [updatedThought] = await this.db.update(thoughts).set({
      isRead: true,
      readAt: new Date()
    }).where(eq(thoughts.id, thoughtId)).returning();

    return !!updatedThought;
  }

  async getUnreadThoughtsCount(clinicId: number): Promise<number> {
    const result = await this.db.select().from(thoughts)
      .where(and(
        eq(thoughts.clinicId, clinicId),
        eq(thoughts.isRead, false),
        eq(thoughts.isDeleted, false)
      ));
    
    return result.length;
  }
}

export const storage = new PostgreSQLStorage();