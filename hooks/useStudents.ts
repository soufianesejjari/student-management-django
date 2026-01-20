import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export function useStudents(page: number = 1, search: string = '') {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (search) {
        params.append('search', search);
    }
    
    const { data, error, isLoading, mutate } = useSWR(`/users/students/?${params.toString()}`, fetcher);

    return {
        students: data?.results || data,
        totalCount: data?.count || 0,
        next: data?.next,
        previous: data?.previous,
        isLoading,
        isError: error,
        mutate
    };
}

export async function createStudent(data: any) {
    return api.post('/users/students/', data);
}

export async function updateStudent(id: number, data: any) {
    return api.patch(`/users/students/${id}/`, data);
}

export async function deleteStudent(id: number) {
    return api.delete(`/users/students/${id}/`);
}
