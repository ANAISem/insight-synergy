import axios from 'axios';

const BASE_URL = process.env.INSIGHT_CORE_API_URL;

export const cognitiveLoopApi = {
  getCognitiveProfile: async (userId: string) => {
    const response = await axios.get(`${BASE_URL}/cognitive-loop/profile/${userId}`);
    return response.data;
  },

  updateCognitiveProfile: async (userId: string, profileData: any) => {
    const response = await axios.put(`${BASE_URL}/cognitive-loop/profile/${userId}`, profileData);
    return response.data;
  },

  // Neue Trainings-Endpunkte
  getTrainingExercises: async (userId: string) => {
    const response = await axios.get(`${BASE_URL}/cognitive-loop/training/${userId}/exercises`);
    return response.data;
  },

  completeExercise: async (userId: string, exerciseId: string) => {
    const response = await axios.post(`${BASE_URL}/cognitive-loop/training/${userId}/complete`, {
      exerciseId
    });
    return response.data;
  },

  getTrainingProgress: async (userId: string) => {
    const response = await axios.get(`${BASE_URL}/cognitive-loop/training/${userId}/progress`);
    return response.data;
  }
}; 