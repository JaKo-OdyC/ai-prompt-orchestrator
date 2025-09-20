// Module management routes
import { Router } from "express";
import { moduleManager, initializeModules, getProviderModule, updateModuleStatus } from "../services/module-service";
import { authService } from "../services/auth-service";
import type { AuthContext } from "../../packages/module-manager/src/auth";

const router = Router();

// Initialize all modules on startup
let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    const auth: AuthContext = { userId: "system", role: "admin", source: "startup" };
    await initializeModules(auth);
    initialized = true;
  }
}

// List all modules
router.get("/", async (req, res) => {
  try {
    await ensureInitialized();
    const modules = await moduleManager.list();
    res.json({ modules });
  } catch (error) {
    console.error("Failed to list modules:", error);
    res.status(500).json({ error: "Failed to list modules" });
  }
});

// Get specific module
router.get("/:id", async (req, res) => {
  try {
    await ensureInitialized();
    const module = await moduleManager.get(req.params.id);
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }
    res.json({ module });
  } catch (error) {
    console.error("Failed to get module:", error);
    res.status(500).json({ error: "Failed to get module" });
  }
});

// Connect module
router.post("/:id/connect", async (req, res) => {
  try {
    await ensureInitialized();
    const auth = authService.requireAuth(req.headers.authorization);
    await updateModuleStatus(req.params.id, "connected", auth);
    res.json({ status: "connected" });
  } catch (error) {
    console.error("Failed to connect module:", error);
    res.status(500).json({ error: "Failed to connect module" });
  }
});

// Disconnect module
router.post("/:id/disconnect", async (req, res) => {
  try {
    await ensureInitialized();
    const auth = authService.requireAuth(req.headers.authorization);
    await updateModuleStatus(req.params.id, "disconnected", auth);
    res.json({ status: "disconnected" });
  } catch (error) {
    console.error("Failed to disconnect module:", error);
    res.status(500).json({ error: "Failed to disconnect module" });
  }
});

export default router;