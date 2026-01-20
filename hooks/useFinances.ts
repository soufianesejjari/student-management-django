import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export function usePayments(page: number = 1, search: string = '') {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (search) params.append('search', search);

    const { data, error, isLoading, mutate } = useSWR(`/finances/payments/?${params.toString()}`, fetcher);
    return {
        payments: data?.results || data,
        totalCount: data?.count || 0,
        next: data?.next,
        previous: data?.previous,
        isLoading,
        isError: error,
        mutate
    };
}

export function useExpenses(page: number = 1, search: string = '') {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (search) params.append('search', search);

    const { data, error, isLoading, mutate } = useSWR(`/finances/expenses/?${params.toString()}`, fetcher);
    return {
        expenses: data?.results || data,
        totalCount: data?.count || 0,
        next: data?.next,
        previous: data?.previous,
        isLoading,
        isError: error,
        mutate
    };
}

export function useFinancialReports(year?: number) {
     const params = year ? `?year=${year}` : '';
     const { data, error, isLoading } = useSWR(`/finances/reports/${params}`, fetcher);
     return {
        reports: data,
        isLoading,
        isError: error
    };
}
