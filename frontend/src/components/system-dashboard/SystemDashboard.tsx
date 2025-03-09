import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Badge, 
  Stack, 
  LinearProgress, 
  Paper, 
  Divider, 
  Chip,
  Card,
  CardContent,
  CardHeader
} from '@mui/material';

type SystemMetric = {
  name: string;
  value: number;
  unit: string;
  change: number;
  status: 'good' | 'warning' | 'critical';
};

type LogEntry = {
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
};

// Gültige Farbtypen für MUI LinearProgress
type ProgressColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

// Gültige Farbtypen für MUI Chip
type ChipColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

const SystemDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([
    { name: 'CPU-Auslastung', value: 42, unit: '%', change: 5, status: 'good' },
    { name: 'Speicherverbrauch', value: 2.1, unit: 'GB', change: -0.3, status: 'good' },
    { name: 'API-Latenz', value: 187, unit: 'ms', change: 12, status: 'warning' },
    { name: 'Anfragen/Sek.', value: 8.3, unit: 'req/s', change: 1.5, status: 'good' }
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'System gestartet und bereit'
    }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(metric => ({
        ...metric,
        value: Math.max(0, metric.value + (Math.random() * 6 - 3)),
        change: Math.random() * 4 - 2,
        status: Math.random() > 0.8 ? 'warning' : 'good'
      })));

      if (Math.random() > 0.7) {
        const newLog: LogEntry = {
          timestamp: new Date().toISOString(),
          level: Math.random() > 0.8 ? 'warning' : 'info',
          message: `System-Update ${Math.floor(Math.random() * 100)}`
        };
        setLogs(prev => [newLog, ...prev].slice(0, 10));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Geändert: Rückgabetyp auf gültige MUI-Farben beschränkt
  const getStatusColor = (status: string): ProgressColor => {
    switch (status) {
      case 'good': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'primary'; // 'default' durch 'primary' ersetzt
    }
  };

  // Chip-Farben für MUI Chip - korrigiert, um nur gültige MUI-Farben zurückzugeben
  const getChipColor = (status: string): ChipColor => {
    switch (status) {
      case 'good': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'primary'; // 'default' durch 'primary' ersetzt
    }
  };

  // Korrigierte Log-Farbfunktion
  const getLogColor = (level: string): ChipColor => {
    switch (level) {
      case 'info': return 'primary';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'secondary'; // 'default' durch 'secondary' ersetzt
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>System-Dashboard</Typography>
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={3}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardHeader 
                title={metric.name} 
                titleTypographyProps={{ variant: 'subtitle1' }}
                action={
                  <Chip 
                    label={metric.status} 
                    color={getChipColor(metric.status)} 
                    size="small"
                  />
                }
              />
              <CardContent>
                <Typography variant="h4" sx={{ mb: 1 }}>
                  {metric.value.toFixed(1)} {metric.unit}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(100, (metric.value / 100) * 100)} 
                  color={getStatusColor(metric.status)}
                  sx={{ mb: 1, height: 8, borderRadius: 2 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {metric.change > 0 ? "↑" : "↓"} {Math.abs(metric.change).toFixed(1)} {metric.unit}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h5" gutterBottom>System-Logs</Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack spacing={2}>
          {logs.length === 0 ? (
            <Typography color="text.secondary">Keine Log-Einträge vorhanden</Typography>
          ) : (
            logs.map((log, index) => (
              <Paper 
                key={index} 
                variant="outlined" 
                sx={{ p: 2 }}
              >
                <Grid container spacing={2} alignItems="center">
                  <Grid item>
                    <Chip 
                      label={log.level.toUpperCase()} 
                      color={getLogColor(log.level)} 
                      size="small" 
                    />
                  </Grid>
                  <Grid item xs>
                    <Typography variant="body1">{log.message}</Typography>
                  </Grid>
                  <Grid item>
                    <Typography variant="caption" color="text.secondary">
                      {formatTimestamp(log.timestamp)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            ))
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

export default SystemDashboard; 