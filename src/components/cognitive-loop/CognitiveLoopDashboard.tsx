import React, { useState } from 'react';
import { Grid, Card, Text, Tabs } from '@nextui-org/react';
import CognitiveProfileView from './CognitiveProfileView';
import CognitiveAnalyticsDashboard from './CognitiveAnalyticsDashboard';
import CognitiveTraining from './CognitiveTraining';
import FeedbackForm from './FeedbackForm';

const CognitiveLoopDashboard: React.FC<{ userId: string }> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <Grid.Container gap={2}>
      <Grid xs={12}>
        <Card>
          <Card.Header>
            <Text h2>Cognitive Loop Dashboard</Text>
          </Card.Header>
          <Card.Body>
            <Tabs
              value={activeTab}
              onChange={(value) => setActiveTab(value as string)}
            >
              <Tabs.Tab value="profile" label="Profil">
                <CognitiveProfileView userId={userId} />
              </Tabs.Tab>
              <Tabs.Tab value="analytics" label="Analytics">
                <CognitiveAnalyticsDashboard userId={userId} />
              </Tabs.Tab>
              <Tabs.Tab value="training" label="Training">
                <CognitiveTraining userId={userId} />
              </Tabs.Tab>
              <Tabs.Tab value="feedback" label="Feedback">
                <FeedbackForm />
              </Tabs.Tab>
            </Tabs>
          </Card.Body>
        </Card>
      </Grid>

      {/* Zusätzliche Statistiken und Zusammenfassungen */}
      <Grid xs={12}>
        <Grid.Container gap={2}>
          <Grid xs={4}>
            <Card>
              <Card.Header>
                <Text h4>Trainingsfortschritt</Text>
              </Card.Header>
              <Card.Body>
                {/* Hier könnten wir den Gesamtfortschritt anzeigen */}
              </Card.Body>
            </Card>
          </Grid>
          <Grid xs={4}>
            <Card>
              <Card.Header>
                <Text h4>Aktuelle Leistung</Text>
              </Card.Header>
              <Card.Body>
                {/* Hier könnten wir die aktuelle Leistung anzeigen */}
              </Card.Body>
            </Card>
          </Grid>
          <Grid xs={4}>
            <Card>
              <Card.Header>
                <Text h4>Nächste Schritte</Text>
              </Card.Header>
              <Card.Body>
                {/* Hier könnten wir Empfehlungen anzeigen */}
              </Card.Body>
            </Card>
          </Grid>
        </Grid.Container>
      </Grid>
    </Grid.Container>
  );
};

export default CognitiveLoopDashboard; 