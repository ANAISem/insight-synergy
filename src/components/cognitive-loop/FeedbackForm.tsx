import React, { useState } from 'react';
import { Button, Textarea, Card } from '@nextui-org/react';

const FeedbackForm = () => {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    console.log('Feedback submitted:', feedback);
    setFeedback('');
  };

  return (
    <Card className="p-4">
      <Textarea
        label="Dein Feedback"
        placeholder="Teile uns deine Gedanken mit..."
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      <Button color="primary" className="mt-4" onClick={handleSubmit}>
        Feedback senden
      </Button>
    </Card>
  );
};

export default FeedbackForm; 