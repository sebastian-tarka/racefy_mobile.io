import { useState, useCallback } from 'react';
import { api } from '../services/api';
import type { CommentaryType } from '../types/api';

export function useGenerateCommentary(eventId: number) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerationType, setLastGenerationType] =
    useState<CommentaryType | null>(null);

  const generate = useCallback(
    async (type: CommentaryType) => {
      setIsGenerating(true);
      setError(null);
      setLastGenerationType(type);

      try {
        const response = await api.generateCommentary(eventId, type);
        return response;
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to generate commentary';
        setError(errorMessage);
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [eventId]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generate,
    isGenerating,
    error,
    lastGenerationType,
    clearError,
  };
}
