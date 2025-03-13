// Definiere die möglichen Ansichten
export type View = 
  | 'welcome' 
  | 'projectOverview' 
  | 'projectCreation' 
  | 'cognitive-loop' 
  | 'nexus' 
  | 'expert-debate'
  | 'live-expert-debate' 
  | 'system-dashboard'
  | 'analysis'
  | 'knowledge-extraction';

// Typen für die Projektdaten
export interface ProjectData {
  title: string;
  description: string;
  type: string;
  goals?: string;
  team?: string;
  deadline?: string;
}

// Typen für Projekte
export interface Project {
  id: string;
  title: string;
  description: string;
  type: string;
  createdAt: string;
  lastModified: string;
  documentsCount: number;
  status: 'active' | 'archived' | 'completed';
} 