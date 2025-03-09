import React, { useState, useEffect } from 'react';
import { Card, Grid, Text, Button, Progress, Modal } from '@nextui-org/react';
import { cognitiveLoopApi } from '../../api/cognitiveLoopApi';

interface TrainingExercise {
  id: string;
  type: 'analytical' | 'creative' | 'strategic';
  title: string;
  description: string;
  difficulty: number;
  estimatedDuration: number;
}

const CognitiveTraining: React.FC<{ userId: string }> = ({ userId }) => {
  const [exercises, setExercises] = useState<TrainingExercise[]>([]);
  const [currentExercise, setCurrentExercise] = useState<TrainingExercise | null>(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const response = await cognitiveLoopApi.getTrainingExercises(userId);
        setExercises(response);
      } catch (error) {
        console.error('Fehler beim Laden der Übungen:', error);
      }
    };
    loadExercises();
  }, [userId]);

  const startExercise = (exercise: TrainingExercise) => {
    setCurrentExercise(exercise);
    setShowExerciseModal(true);
    setProgress(0);
  };

  const completeExercise = async () => {
    if (!currentExercise) return;

    try {
      await cognitiveLoopApi.completeExercise(userId, currentExercise.id);
      setShowExerciseModal(false);
      setCurrentExercise(null);
      // Aktualisiere die Übungsliste
      const response = await cognitiveLoopApi.getTrainingExercises(userId);
      setExercises(response);
    } catch (error) {
      console.error('Fehler beim Abschließen der Übung:', error);
    }
  };

  return (
    <Grid.Container gap={2}>
      <Grid xs={12}>
        <Text h2>Kognitives Training</Text>
      </Grid>

      {exercises.map((exercise) => (
        <Grid xs={4} key={exercise.id}>
          <Card>
            <Card.Header>
              <Text h4>{exercise.title}</Text>
            </Card.Header>
            <Card.Body>
              <Text>{exercise.description}</Text>
              <Text>Schwierigkeit: {exercise.difficulty}/10</Text>
              <Text>Dauer: {exercise.estimatedDuration} Minuten</Text>
            </Card.Body>
            <Card.Footer>
              <Button 
                color="primary" 
                onClick={() => startExercise(exercise)}
              >
                Übung starten
              </Button>
            </Card.Footer>
          </Card>
        </Grid>
      ))}

      <Modal
        open={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        width="600px"
      >
        {currentExercise && (
          <>
            <Modal.Header>
              <Text h3>{currentExercise.title}</Text>
            </Modal.Header>
            <Modal.Body>
              <Text>{currentExercise.description}</Text>
              <Progress 
                value={progress} 
                color="primary" 
                status="primary"
                className="mt-4"
              />
            </Modal.Body>
            <Modal.Footer>
              <Button auto color="error" onClick={() => setShowExerciseModal(false)}>
                Abbrechen
              </Button>
              <Button auto color="success" onClick={completeExercise}>
                Übung abschließen
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </Grid.Container>
  );
};

export default CognitiveTraining; 