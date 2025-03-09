import { Router } from 'express';
import { performance } from 'perf_hooks';
import os from 'os';
import { InsightSynergyCore } from '../core/InsightSynergyCore';

// Startzeit der Anwendung für Uptime-Berechnung
const startTime = performance.now();

export function createHealthRouter(insightCore: InsightSynergyCore): Router {
  const router = Router();

  /**
   * @route GET /api/health
   * @description Einfacher Health-Check Endpunkt
   * @returns {Object} Health status information
   */
  router.get('/', async (_req, res) => {
    try {
      // Hole System-Status vom Insight Synergy Core
      const coreStatus = await insightCore.getSystemStatus();
      
      // Berechne Uptime in Sekunden
      const uptime = (performance.now() - startTime) / 1000;
      
      // Basis-Health-Check Response
      res.json({
        status: 'OK',
        version: process.env.npm_package_version || '1.0.0',
        uptime_seconds: uptime,
        core_status: coreStatus.status,
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      console.error('Fehler beim Health-Check:', error);
      res.status(500).json({
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
    }
  });

  /**
   * @route GET /api/health/details
   * @description Detaillierte Gesundheitsinformationen
   * @returns {Object} Detailed health information
   */
  router.get('/details', async (_req, res) => {
    try {
      // Hole System-Status vom Insight Synergy Core
      const coreStatus = await insightCore.getSystemStatus();
      
      // Berechne Uptime in Sekunden
      const uptime = (performance.now() - startTime) / 1000;
      
      // Detaillierte System-Informationen
      res.json({
        status: 'OK',
        version: process.env.npm_package_version || '1.0.0',
        uptime_seconds: uptime,
        core_status: coreStatus,
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          usage_percent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
        },
        cpu: {
          cores: os.cpus().length,
          model: os.cpus()[0].model,
          load: os.loadavg()
        },
        system: {
          platform: os.platform(),
          arch: os.arch(),
          hostname: os.hostname()
        },
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      console.error('Fehler beim detaillierten Health-Check:', error);
      res.status(500).json({
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
    }
  });

  return router;
} 