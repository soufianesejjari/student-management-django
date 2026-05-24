import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export function useTeacherSessions(teacherId: number, year: number, month: number) {
    const { data, error, isLoading, mutate } = useSWR(
        teacherId ? `/planning/teacher/${teacherId}/sessions/?year=${year}&month=${month}` : null,
        fetcher
    );

    return {
        data,
        isLoading,
        isError: error,
        mutate
    };
}

export async function updateSessionAttendance(teacherId: number, sessionId: number, date: string, isAbsent: boolean) {
    return api.patch(`/planning/teacher/${teacherId}/sessions/`, {
        session_id: sessionId,
        date,
        teacher_is_absent: isAbsent
    });
}

export async function validateTeacherPayroll(teacherId: number, year: number, month: number) {
    return api.post(`/planning/teacher/${teacherId}/payroll/validate/`, {
        year,
        month
    });
}

export async function reopenTeacherPayroll(teacherId: number, year: number, month: number) {
    return api.post(`/planning/teacher/${teacherId}/payroll/reopen/`, {
        year,
        month
    });
}

export async function validateMonthlyTeacherPayrolls(year: number, month: number) {
    return api.post('/planning/teacher-payrolls/validate-month/', {
        year,
        month
    });
}
