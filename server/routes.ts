import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";

// Extend session interface
declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}
import { storage } from "./storage";
import { requireAuth, requireAdmin, type AuthenticatedRequest } from "./middleware/auth";
import { 
  loginSchema, 
  insertUserSchema, 
  insertClinicSchema, 
  insertThoughtSchema,
  changePasswordSchema,
  setupAdminSchema
} from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'thoughts-app-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  }));

  // Check if system needs setup
  app.get("/api/system/status", async (req, res) => {
    try {
      const hasUsers = await storage.hasAnyUsers();
      res.json({ needsSetup: !hasUsers });
    } catch (error) {
      res.status(500).json({ message: "Failed to check system status" });
    }
  });

  // Setup first admin
  app.post("/api/system/setup", async (req, res) => {
    try {
      const hasUsers = await storage.hasAnyUsers();
      if (hasUsers) {
        return res.status(400).json({ message: "System already set up" });
      }

      const setupData = setupAdminSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(setupData.password, 10);
      const result = await storage.setupFirstAdmin({
        user: {
          username: setupData.username,
          email: setupData.email,
          password: hashedPassword,
          role: "admin",
        },
        clinic: {
          name: setupData.clinicName,
          url: setupData.clinicUrl || null,
          logoUrl: null,
          departments: ["General", "Administration"],
        }
      });

      // Auto-login the first admin
      req.session.userId = result.user.id;
      
      res.json({ 
        message: "Setup completed successfully",
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          role: result.user.role,
          clinic: result.clinic
        }
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Setup failed" });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      
      const userWithClinic = await storage.getUserWithClinic(user.id);
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          role: user.role,
          clinic: userWithClinic?.clinic || null
        } 
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userWithClinic = await storage.getUserWithClinic(req.user!.id);
      if (!userWithClinic) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        user: {
          id: userWithClinic.id,
          username: userWithClinic.username,
          email: userWithClinic.email,
          role: userWithClinic.role,
          clinic: userWithClinic.clinic
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user data" });
    }
  });

  // Password change
  app.post("/api/auth/change-password", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      
      const user = await storage.getUser(req.user!.id);
      if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(req.user!.id, { password: hashedNewPassword });
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Clinic management routes (Admin only)
  app.get("/api/clinics", requireAuth, requireAdmin, async (req, res) => {
    try {
      const clinics = await storage.getAllClinics();
      res.json(clinics);
    } catch (error) {
      res.status(500).json({ message: "Failed to get clinics" });
    }
  });

  app.get("/api/clinics/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const clinic = await storage.getClinic(id);
      
      if (!clinic) {
        return res.status(404).json({ message: "Clinic not found" });
      }

      // For non-admin users, only allow access to their own clinic
      if (req.user!.role !== "admin" && req.user!.clinicId !== id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get clinic stats
      const users = await storage.getUsersByClinic(id);
      const thoughts = await storage.getThoughtsByClinic(id);

      res.json({
        ...clinic,
        userCount: users.length,
        thoughtCount: thoughts.length,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get clinic" });
    }
  });

  app.post("/api/clinics", requireAuth, requireAdmin, async (req, res) => {
    try {
      const clinicData = insertClinicSchema.parse(req.body);
      const clinic = await storage.createClinic(clinicData);
      res.status(201).json(clinic);
    } catch (error) {
      res.status(400).json({ message: "Invalid clinic data" });
    }
  });

  app.put("/api/clinics/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertClinicSchema.partial().parse(req.body);
      
      const clinic = await storage.updateClinic(id, updates);
      if (!clinic) {
        return res.status(404).json({ message: "Clinic not found" });
      }

      res.json(clinic);
    } catch (error) {
      res.status(400).json({ message: "Invalid clinic data" });
    }
  });

  app.delete("/api/clinics/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if this is the last clinic
      const allClinics = await storage.getAllClinics();
      if (allClinics.length === 1) {
        return res.status(400).json({ message: "Cannot delete the last clinic in the system" });
      }
      
      const success = await storage.deleteClinic(id);
      if (!success) {
        return res.status(404).json({ message: "Clinic not found" });
      }

      res.json({ message: "Clinic deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete clinic" });
    }
  });

  // Department management routes
  app.get("/api/clinics/:id/departments", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if user has access to this clinic
      if (req.user?.role !== 'admin' && req.user?.clinicId !== id) {
        return res.status(403).json({ message: "Access denied to this clinic" });
      }
      
      const departments = await storage.getDepartmentsByClinic(id);
      res.json(departments);
    } catch (error) {
      console.error("Get departments error:", error);
      res.status(500).json({ message: "Failed to get departments" });
    }
  });

  app.patch("/api/thoughts/:id/read", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const thoughtId = parseInt(req.params.id);
      const success = await storage.markThoughtAsRead(thoughtId);
      
      if (!success) {
        return res.status(404).json({ message: "Thought not found" });
      }
      
      res.json({ message: "Thought marked as read" });
    } catch (error: any) {
      console.error("Mark thought as read error:", error);
      res.status(500).json({ message: error.message || "Failed to mark thought as read" });
    }
  });

  app.post("/api/clinics/:id/departments", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { department } = req.body;
      
      if (!department || typeof department !== 'string') {
        return res.status(400).json({ message: "Department name is required" });
      }

      const trimmedDepartment = department.trim();
      if (!trimmedDepartment) {
        return res.status(400).json({ message: "Department name cannot be empty" });
      }

      const success = await storage.addDepartmentToClinic(id, trimmedDepartment);
      if (!success) {
        return res.status(400).json({ message: "Department already exists or clinic not found" });
      }

      const departments = await storage.getDepartmentsByClinic(id);
      res.json(departments);
    } catch (error) {
      res.status(500).json({ message: "Failed to add department" });
    }
  });

  app.put("/api/clinics/:id/departments", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { oldDepartment, newDepartment } = req.body;
      
      console.log("Update department request:", { id, oldDepartment, newDepartment, body: req.body });
      
      if (!oldDepartment || !newDepartment || typeof oldDepartment !== 'string' || typeof newDepartment !== 'string') {
        return res.status(400).json({ message: "Both old and new department names are required as strings" });
      }

      const trimmedOld = oldDepartment.trim();
      const trimmedNew = newDepartment.trim();
      
      if (!trimmedOld || !trimmedNew) {
        return res.status(400).json({ message: "Department names cannot be empty" });
      }

      const success = await storage.updateDepartmentInClinic(id, trimmedOld, trimmedNew);
      if (!success) {
        return res.status(400).json({ message: "Department not found or new name already exists" });
      }

      const departments = await storage.getDepartmentsByClinic(id);
      res.json(departments);
    } catch (error: any) {
      console.error("Update department error:", error);
      res.status(500).json({ message: error.message || "Failed to update department" });
    }
  });

  app.delete("/api/clinics/:id/departments/:department", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const department = decodeURIComponent(req.params.department);
      
      console.log("Delete department request:", { id, department, originalParam: req.params.department });
      
      if (typeof department !== 'string') {
        return res.status(400).json({ message: "Invalid department parameter" });
      }
      
      const trimmedDepartment = department.trim();
      if (!trimmedDepartment) {
        return res.status(400).json({ message: "Department name cannot be empty" });
      }

      const success = await storage.removeDepartmentFromClinic(id, trimmedDepartment);
      if (!success) {
        return res.status(400).json({ message: "Department not found or cannot delete last department" });
      }

      const departments = await storage.getDepartmentsByClinic(id);
      res.json(departments);
    } catch (error: any) {
      console.error("Delete department error:", error);
      res.status(500).json({ message: error.message || "Failed to delete department" });
    }
  });

  // File upload for clinic logos
  app.post("/api/clinics/:id/logo", requireAuth, requireAdmin, upload.single('logo'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // In a real app, you'd store this in cloud storage
      // For now, we'll just store the filename
      const logoUrl = `/uploads/${req.file.filename}`;
      
      const clinic = await storage.updateClinic(id, { logoUrl });
      if (!clinic) {
        return res.status(404).json({ message: "Clinic not found" });
      }

      res.json({ logoUrl });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  // User management routes (Admin only)
  app.get("/api/users", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const clinicId = req.query.clinicId ? parseInt(req.query.clinicId as string) : null;
      
      if (clinicId) {
        // Get users for specific clinic
        const users = await storage.getUsersByClinic(clinicId);
        // Remove passwords from response
        const safeUsers = users.map(user => {
          const { password, ...safeUser } = user;
          return safeUser;
        });
        res.json(safeUsers);
      } else {
        // If no clinic specified, get users from admin's clinic
        const user = await storage.getUser(req.user!.id);
        if (!user?.clinicId) {
          return res.status(400).json({ message: "Admin user must be associated with a clinic" });
        }
        const users = await storage.getUsersByClinic(user.clinicId);
        // Remove passwords from response
        const safeUsers = users.map(user => {
          const { password, ...safeUser } = user;
          return safeUser;
        });
        res.json(safeUsers);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.post("/api/users", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists. Please choose a different username." });
      }
      
      // Admin can specify clinic ID, otherwise use their own clinic
      let clinicId = userData.clinicId;
      if (!clinicId) {
        const admin = await storage.getUser(req.user!.id);
        if (!admin?.clinicId) {
          return res.status(400).json({ message: "Admin user must be associated with a clinic or specify clinicId" });
        }
        clinicId = admin.clinicId;
      }

      // Hash the password before storing
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await storage.createUser({ 
        ...userData, 
        password: hashedPassword,
        clinicId 
      });
      // Remove password from response
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.get("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.put("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertUserSchema.partial().parse(req.body);
      
      // Check if username is being updated and if it already exists
      if (updates.username) {
        const existingUser = await storage.getUserByUsername(updates.username);
        if (existingUser && existingUser.id !== id) {
          return res.status(400).json({ message: "Username already exists. Please choose a different username." });
        }
      }
      
      // Hash password if it's being updated
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }
      
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.delete("/api/users/:id", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Don't allow deleting self
      if (id === req.user!.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Thought management routes
  app.get("/api/thoughts", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const clinicId = req.query.clinicId ? parseInt(req.query.clinicId as string) : req.user!.clinicId;
      
      if (!clinicId) {
        return res.status(400).json({ message: "User must be associated with a clinic or specify clinicId" });
      }

      // For admin users, allow querying any clinic. For regular users, only their own clinic
      if (req.user!.role !== "admin" && clinicId !== req.user!.clinicId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // For admins, include deleted thoughts; for users, only show non-deleted thoughts
      const includeDeleted = req.user!.role === 'admin';
      
      // Parse filters from query parameters
      const filters: any = {};
      if (req.query.startDate) filters.startDate = req.query.startDate as string;
      if (req.query.endDate) filters.endDate = req.query.endDate as string;
      if (req.query.userId) filters.userId = parseInt(req.query.userId as string);
      if (req.query.department) filters.department = req.query.department as string;
      if (req.query.includeRead !== undefined) filters.includeRead = req.query.includeRead === 'true';
      
      const thoughts = await storage.getThoughtsByClinic(clinicId, includeDeleted, filters);
      res.json(thoughts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get thoughts" });
    }
  });

  app.post("/api/thoughts", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user!.clinicId) {
        return res.status(400).json({ message: "User must be associated with a clinic" });
      }

      const thoughtData = insertThoughtSchema.parse({
        ...req.body,
        authorId: req.user!.id,
        clinicId: req.user!.clinicId,
      });

      const thought = await storage.createThought(thoughtData, req.user!.id);
      res.status(201).json(thought);
    } catch (error) {
      res.status(400).json({ message: "Invalid thought data" });
    }
  });

  app.put("/api/thoughts/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const thought = await storage.getThought(id);
      
      if (!thought) {
        return res.status(404).json({ message: "Thought not found" });
      }

      // Only allow editing own thoughts or admin can edit any
      if (thought.authorId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const updates = insertThoughtSchema.partial().parse(req.body);
      const updatedThought = await storage.updateThought(id, updates, req.user!.id);
      
      if (!updatedThought) {
        return res.status(404).json({ message: "Thought not found" });
      }

      res.json(updatedThought);
    } catch (error) {
      res.status(400).json({ message: "Invalid thought data" });
    }
  });

  app.delete("/api/thoughts/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const thought = await storage.getThought(id);
      
      if (!thought) {
        return res.status(404).json({ message: "Thought not found" });
      }

      // Only allow deleting own thoughts or admin can delete any
      if (thought.authorId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const deleted = await storage.deleteThought(id, req.user!.id);
      if (!deleted) {
        return res.status(404).json({ message: "Thought not found" });
      }

      res.json({ message: "Thought deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete thought" });
    }
  });

  // Get thought history
  app.get("/api/thoughts/:id/history", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const history = await storage.getThoughtHistory(id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to get thought history" });
    }
  });

  // Get unread thoughts count for admin dashboard
  app.get("/api/clinics/:id/unread-count", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const clinicId = parseInt(req.params.id);
      const count = await storage.getUnreadThoughtsCount(clinicId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to get unread count" });
    }
  });



  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  const httpServer = createServer(app);
  return httpServer;
}
