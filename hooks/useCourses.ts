import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export function useCourses(page: number = 1, search: string = '') {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (search) {
        params.append('search', search);
    }

    const { data, error, isLoading, mutate } = useSWR(`/academics/courses/?${params.toString()}`, fetcher);

    return {
        courses: data?.results || data,
        totalCount: data?.count || 0,
        next: data?.next,
        previous: data?.previous,
        isLoading,
        isError: error,
        mutate
    };
}

export async function createCourse(data: any) {
    return api.post('/academics/courses/', data);
}

export async function updateCourse(id: number, data: any) {
    return api.patch(`/academics/courses/${id}/`, data);
}

export async function deleteCourse(id: number) {
    return api.delete(`/academics/courses/${id}/`);
}
