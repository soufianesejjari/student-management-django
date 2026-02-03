import { useState, useEffect } from 'react';
import api from '@/lib/api';

export interface Subject {
  id: number;
  name: string;
  color_code: string;
  subject_type?: string;
}

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        const response = await api.get('/academics/subjects/');
        setSubjects(response.data.results || response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch subjects');
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  const createSubject = async (name: string, color_code: string, subject_type: string) => {
    try {
      const response = await api.post('/academics/subjects/', {
        name,
        color_code,
        subject_type,
      });
      setSubjects([...subjects, response.data]);
      return response.data;
    } catch (err) {
      throw err;
    }
  };

  const updateSubject = async (id: number, name: string, color_code: string, subject_type: string) => {
    try {
      const response = await api.patch(`/academics/subjects/${id}/`, {
        name,
        color_code,
        subject_type,
      });
      setSubjects(subjects.map(s => s.id === id ? response.data : s));
      return response.data;
    } catch (err) {
      throw err;
    }
  };

  const deleteSubject = async (id: number) => {
    try {
      await api.delete(`/academics/subjects/${id}/`);
      setSubjects(subjects.filter(s => s.id !== id));
    } catch (err) {
      throw err;
    }
  };

  return {
    subjects,
    loading,
    error,
    createSubject,
    updateSubject,
    deleteSubject,
  };
}
