import React, { useEffect, useState } from 'react';
import { Card, Grid, Text, Progress } from '@nextui-org/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { cognitiveLoopApi } from '../../api/cognitiveLoopApi';
import useCognitiveLoopWebSocket from '../../hooks/useCognitiveLoopWebSocket';

interface AnalyticsData {
  thoughtPatternTrends: Array<{
    timestamp: string;
    analyticalScore: number;
    creativeScore: number;
    strategicScore: number;
  }>;
  currentScores: {
    analytical: number;
    creative: number;
    strategic: number;
  };
}

const CognitiveAnalyticsDashboard: React.FC<{ userId: string }> = ({ userId }) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await cognitiveLoopApi.getCognitiveProfile(userId);
        setAnalyticsData(response);
      } catch (error) {
        console.error('Fehler beim Laden der Analytics:', error);
      }
    };
    fetchAnalytics();
  }, [userId]);

  useCognitiveLoopWebSocket(userId, (data) => {
    setAnalyticsData(prevData => ({
      ...prevData!,
      currentScores: data.currentScores
    }));
  });

  if (!analyticsData) return <Text>Lade Analytics...</Text>;

  return (
    <Grid.Container gap={2}>
      <Grid xs={12}>
        <Card>
          <Card.Header>
            <Text h3>Kognitive Entwicklung über Zeit</Text>
          </Card.Header>
          <Card.Body>
            <LineChart width={800} height={400} data={analyticsData.thoughtPatternTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="analyticalScore" stroke="#8884d8" name="Analytisch" />
              <Line type="monotone" dataKey="creativeScore" stroke="#82ca9d" name="Kreativ" />
              <Line type="monotone" dataKey="strategicScore" stroke="#ffc658" name="Strategisch" />
            </LineChart>
          </Card.Body>
        </Card>
      </Grid>

      <Grid xs={12}>
        <Card>
          <Card.Header>
            <Text h3>Aktuelle Werte</Text>
          </Card.Header>
          <Card.Body>
            <Grid.Container gap={2}>
              <Grid xs={4}>
                <div>
                  <Text>Analytisches Denken</Text>
                  <Progress 
                    value={analyticsData.currentScores.analytical} 
                    color="primary" 
                    status="primary"
                  />
                </div>
              </Grid>
              <Grid xs={4}>
                <div>
                  <Text>Kreatives Denken</Text>
                  <Progress 
                    value={analyticsData.currentScores.creative} 
                    color="success" 
                    status="success"
                  />
                </div>
              </Grid>
              <Grid xs={4}>
                <div>
                  <Text>Strategisches Denken</Text>
                  <Progress 
                    value={analyticsData.currentScores.strategic} 
                    color="warning" 
                    status="warning"
                  />
                </div>
              </Grid>
            </Grid.Container>
          </Card.Body>
        </Card>
      </Grid>
    </Grid.Container>
  );
};

export default CognitiveAnalyticsDashboard; 