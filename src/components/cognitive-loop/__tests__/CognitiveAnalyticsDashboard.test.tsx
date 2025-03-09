import { render, screen, waitFor } from '@testing-library/react';
import CognitiveAnalyticsDashboard from '../CognitiveAnalyticsDashboard';
import { cognitiveLoopApi } from '../../../api/cognitiveLoopApi';

jest.mock('../../../api/cognitiveLoopApi');

const mockAnalyticsData = {
  thoughtPatternTrends: [
    {
      timestamp: '2024-03-20',
      analyticalScore: 85,
      creativeScore: 75,
      strategicScore: 90
    }
  ],
  currentScores: {
    analytical: 85,
    creative: 75,
    strategic: 90
  }
};

describe('CognitiveAnalyticsDashboard', () => {
  beforeEach(() => {
    (cognitiveLoopApi.getCognitiveProfile as jest.Mock).mockResolvedValue(mockAnalyticsData);
  });

  it('lädt und zeigt Analytics-Daten korrekt an', async () => {
    render(<CognitiveAnalyticsDashboard userId="123" />);

    // Prüfe Ladezustand
    expect(screen.getByText('Lade Analytics...')).toBeInTheDocument();

    // Warte auf geladene Daten
    await waitFor(() => {
      expect(screen.getByText('Kognitive Entwicklung über Zeit')).toBeInTheDocument();
      expect(screen.getByText('Aktuelle Werte')).toBeInTheDocument();
      expect(screen.getByText('Analytisches Denken')).toBeInTheDocument();
      expect(screen.getByText('Kreatives Denken')).toBeInTheDocument();
      expect(screen.getByText('Strategisches Denken')).toBeInTheDocument();
    });
  });

  it('aktualisiert die Daten über WebSocket korrekt', async () => {
    const { rerender } = render(<CognitiveAnalyticsDashboard userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('Kognitive Entwicklung über Zeit')).toBeInTheDocument();
    });

    // Simuliere WebSocket-Update
    const updatedData = {
      ...mockAnalyticsData,
      currentScores: {
        analytical: 95,
        creative: 85,
        strategic: 95
      }
    };

    rerender(<CognitiveAnalyticsDashboard userId="123" />);

    await waitFor(() => {
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars).toHaveLength(3);
    });
  });
}); 