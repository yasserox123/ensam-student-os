/**
 * Secure REST API for ENSAM LISE timetable sync.
 *
 * Endpoints:
 *   POST /api/credentials      - Store encrypted credentials
 *   POST /api/timetable/sync   - Sync using stored credentials (userId only)
 */

import express, { Request, Response } from "express";
import { syncTimetable } from "./integration";
import { upsertTimetableSlots } from "./db/timetableRepository";
import {
  storeCredentials,
  getCredentials,
  hasCredentials,
  deleteCredentials,
} from "./db/credentialsRepository";
import { getTimetableSlots } from "./db/timetableRepository";
import type { ENSAMCredentials } from "./types";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

interface StoreCredentialsBody {
  userId: string;
  username: string;
  password: string;
}

interface SyncBody {
  userId: string;
}

/**
 * POST /api/credentials
 * Store encrypted credentials for a user.
 */
app.post("/api/credentials", async (req: Request, res: Response) => {
  try {
    const { userId, username, password } = req.body as StoreCredentialsBody;

    if (!userId || !username || !password) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: userId, username, password",
      });
      return;
    }

    await storeCredentials(userId, { username, password });

    res.json({
      success: true,
      message: "Credentials stored securely",
    });
  } catch (err) {
    console.error("[API] Failed to store credentials:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to store credentials",
    });
  }
});

/**
 * GET /api/credentials/:userId
 * Check if credentials exist for a user.
 */
app.get("/api/credentials/:userId", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const exists = await hasCredentials(userId);

    res.json({
      success: true,
      userId,
      hasCredentials: exists,
    });
  } catch (err) {
    console.error("[API] Failed to check credentials:", err);
    res.status(500).json({
      success: false,
      error: "Failed to check credentials",
    });
  }
});

/**
 * DELETE /api/credentials/:userId
 * Delete stored credentials for a user.
 */
app.delete("/api/credentials/:userId", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    await deleteCredentials(userId);

    res.json({
      success: true,
      message: "Credentials deleted",
    });
  } catch (err) {
    console.error("[API] Failed to delete credentials:", err);
    res.status(500).json({
      success: false,
      error: "Failed to delete credentials",
    });
  }
});

/**
 * POST /api/timetable/sync
 * Sync timetable using stored credentials.
 */
app.post("/api/timetable/sync", async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as SyncBody;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: "Missing required field: userId",
      });
      return;
    }

    // 1. Retrieve stored credentials
    const credentials = await getCredentials(userId);

    if (!credentials) {
      res.status(404).json({
        success: false,
        error: "No credentials found for user. Use POST /api/credentials first.",
      });
      return;
    }

    // 2. Run scraper with stored credentials
    const result = await syncTimetable(credentials, { weeksToFetch: 1 });

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: result.error || "Scraper failed",
      });
      return;
    }

    // 3. Get events
    const allEvents = result.weeks.flatMap((week) => week.events);
    const scrapedCount = allEvents.length;

    // 4. Save to database
    const { upserted, skipped } = await upsertTimetableSlots(userId, allEvents);

    // 5. Return response
    res.json({
      success: true,
      scraped: scrapedCount,
      stored: upserted,
      skipped: skipped,
    });
  } catch (err) {
    console.error("[API] Sync failed:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Sync failed",
    });
  }
});

/**
 * GET /api/timetable?userId=xxx&startDate=...&endDate=...
 * Get stored timetable slots for a user.
 */
app.get("/api/timetable", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: "Missing required query param: userId",
      });
      return;
    }

    const slots = await getTimetableSlots(userId, startDate, endDate);

    res.json({
      success: true,
      slots,
      count: slots.length,
    });
  } catch (err) {
    console.error("[API] Failed to fetch timetable:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch timetable",
    });
  }
});

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: "Not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  POST /api/credentials    - Store credentials`);
  console.log(`  POST /api/timetable/sync - Sync timetable (uses stored credentials)`);
});
