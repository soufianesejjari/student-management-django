import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export function useDashboardStats() {
    const { data, error, isLoading } = useSWR('/dashboard/stats/', fetcher);

    return {
        stats: data,
        isLoading,
        isError: error
    };
}

export function useUpcomingClasses() {
    const { data, error, isLoading } = useSWR('/dashboard/upcoming-classes/', fetcher);

    return {
        classes: data,
        isLoading,
        isError: error
    };
}

export function useDashboardReports() {
    const { data, error, isLoading } = useSWR('/dashboard/reports/', fetcher);

    return {
        reports: data,
        isLoading,
        isError: error
    };
}
