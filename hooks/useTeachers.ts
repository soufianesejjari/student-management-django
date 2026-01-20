import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export function useTeachers(page: number = 1, search: string = '') {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (search) {
        params.append('search', search);
    }

    const { data, error, isLoading, mutate } = useSWR(`/users/teachers/?${params.toString()}`, fetcher);

    return {
        teachers: data?.results || data,
        totalCount: data?.count || 0,
        next: data?.next,
        previous: data?.previous,
        isLoading,
        isError: error,
        mutate
    };
}

export async function createTeacher(data: any) {
    return api.post('/users/teachers/', data);
}

export async function updateTeacher(id: number, data: any) {
    return api.patch(`/users/teachers/${id}/`, data);
}

export async function deleteTeacher(id: number) {
    return api.delete(`/users/teachers/${id}/`);
}
