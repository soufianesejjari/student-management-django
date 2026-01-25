import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export function useRooms(page: number = 1, search: string = '') {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (search) params.append('search', search);

    const { data, error, isLoading, mutate } = useSWR(`/planning/rooms/?${params.toString()}`, fetcher);
    
    return {
        rooms: Array.isArray(data) ? data : data?.results || [],
        totalCount: data?.count || 0,
        next: data?.next,
        previous: data?.previous,
        isLoading,
        isError: error,
        mutate
    };
}

export function useRoom(id: number | null) {
    const { data, error, isLoading, mutate } = useSWR(
        id ? `/planning/rooms/${id}/` : null,
        fetcher
    );
    
    return {
        room: data,
        isLoading,
        isError: error,
        mutate
    };
}
