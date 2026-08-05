/**
 * usePermissions – hook for checking what the current user can do.
 *
 * Admins always return true for every permission check.
 * Secrétaires are checked against the `permissions` list embedded in their JWT.
 *
 * Permission strings follow Django's convention:  "<app_label>.<codename>"
 * e.g.  "academics.view_course",  "finances.add_payment"
 *
 * Module-level shortcuts: checks for ANY permission in a given app label.
 * e.g.  canAccessModule('finances')  → true if user has any finances.* perm
 */

import { useAuth } from '@/context/AuthContext';

// Map sections of the UI → the Django app label they require
export const MODULE_PERMISSIONS: Record<string, string> = {
    students:  'users',
    teachers:  'users',
    courses:   'academics',
    subjects:  'academics',
    rooms:     'planning',
    schedule:  'planning',
    finances:  'finances',
    reports:   'finances',  // or dashboard – allows read access to reports
    users:     '__admin__', // admin-only section
    admins:    '__admin__', // admin-only section
    settings:  '__admin__',
};

export function usePermissions() {
    const { user, isAdmin } = useAuth();

    /**
     * Check a full Django-style permission, e.g. "finances.add_payment".
     * Admins always pass.
     */
    const hasPermission = (permission: string): boolean => {
        if (isAdmin) return true;
        if (!user?.permissions) return false;
        const perms = user.permissions as string[];
        if (perms.includes('*')) return true;
        return perms.includes(permission);
    };

    /**
     * Check if the user has ANY permission in a given module/app_label.
     * Useful for showing/hiding nav items.
     */
    const canAccessModule = (module: string): boolean => {
        if (isAdmin) return true;
        const requiredApp = MODULE_PERMISSIONS[module];
        if (!requiredApp) return true; // unknown modules are public

        // admin-only modules
        if (requiredApp === '__admin__') return false;

        if (!user?.permissions) return false;
        const perms = user.permissions as string[];
        if (perms.includes('*')) return true;
        return perms.some((p) => p.startsWith(`${requiredApp}.`));
    };

    return {
        hasPermission,
        canAccessModule,
        isAdmin,
        role: user?.role ?? null,
    };
}
