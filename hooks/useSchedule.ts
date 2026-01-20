import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export function useSchedule(startDate?: string, endDate?: string) {
    // Build query string
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    const { data, error, isLoading, mutate } = useSWR(`/planning/sessions/grid/${queryString}`, fetcher);

    return {
        sessions: data,
        isLoading,
        isError: error,
        mutate
    };
}
