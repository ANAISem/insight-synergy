import { render, screen, waitFor } from '@testing-library/react';
import CognitiveProfileView from '../CognitiveProfileView';
import { cognitiveLoopApi } from '../../../api/cognitiveLoopApi';

jest.mock('../../../api/cognitiveLoopApi');

const mockProfileData = {
  overview: { totalThoughtPatterns: 5, totalPreferences: 3, totalInterests: 7 },
  thoughtPatterns: [{ id: '1', name: 'Analytical', score: 90 }],
  preferences: [{ id: '1', name: 'Visual Learning', score: 85 }],
  interests: [{ id: '1', name: 'Technology', score: 95 }]
};

describe('CognitiveProfileView', () => {
  it('renders cognitive profile data correctly', async () => {
    (cognitiveLoopApi.getCognitiveProfile as jest.Mock).mockResolvedValue(mockProfileData);

    render(<CognitiveProfileView userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('Analytical')).toBeInTheDocument();
      expect(screen.getByText('Visual Learning')).toBeInTheDocument();
      expect(screen.getByText('Technology')).toBeInTheDocument();
    });
  });
}); 