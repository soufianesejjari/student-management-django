from datetime import date, datetime, timedelta
from calendar import monthrange
from decimal import Decimal
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from .models import ClassSession, SessionInstance, TeacherMonthlyPayroll
from finances.models import Expense

def get_teacher_monthly_occurrences(teacher, year, month, academic_year=None):
    first_day = date(year, month, 1)
    last_day = date(year, month, monthrange(year, month)[1])
    
    # We will search instances bounded by +/- 31 days to catch cross-month rescheduling
    search_start = first_day - timedelta(days=31)
    search_end = last_day + timedelta(days=31)
    
    sessions = ClassSession.objects.filter(
        teacher=teacher
    ).filter(
        Q(start_date__lte=search_end) & 
        (Q(end_date__gte=search_start) | Q(end_date__isnull=True))
    ).select_related('course', 'room')

    if academic_year:
        sessions = sessions.filter(academic_year=academic_year)
    
    instances = SessionInstance.objects.filter(
        class_session__in=sessions,
        original_date__gte=search_start,
        original_date__lte=search_end
    ).select_related('new_room')
    
    # Organize instances by (session_id, original_date)
    instance_map = {(inst.class_session_id, inst.original_date): inst for inst in instances}
    
    occurrences = []
    
    for session in sessions:
        current_day = max(search_start, session.start_date)
        end_limit = min(search_end, session.end_date) if session.end_date else search_end
        
        # Advance current_day to the first valid day of week for this session
        days_to_add = (session.day_of_week - current_day.weekday()) % 7
        current_day += timedelta(days=days_to_add)
        
        while current_day <= end_limit:
            instance = instance_map.get((session.id, current_day))
            
            actual_date = current_day
            actual_start = session.start_time
            actual_end = session.end_time
            actual_room = session.room.name
            is_cancelled = False
            is_absent = False
            
            if instance:
                is_cancelled = instance.is_cancelled
                is_absent = instance.teacher_is_absent
                if instance.is_rescheduled:
                    if instance.new_date:
                        actual_date = instance.new_date
                    if instance.new_start_time:
                        actual_start = instance.new_start_time
                    if instance.new_end_time:
                        actual_end = instance.new_end_time
                    if instance.new_room:
                        actual_room = instance.new_room.name
            
            # Check if this resulting session lands in the target month!
            if first_day <= actual_date <= last_day:
                start_dt = datetime.combine(actual_date, actual_start)
                end_dt = datetime.combine(actual_date, actual_end)
                duration_hours = max((end_dt - start_dt).total_seconds() / 3600, 0)
                
                occurrences.append({
                    'id': session.id,
                    'instance_id': instance.id if instance else None,
                    'date': actual_date.isoformat(),
                    'day_of_week': actual_date.weekday(),
                    'course': session.course.name,
                    'start_time': actual_start.isoformat(),
                    'end_time': actual_end.isoformat(),
                    'room': actual_room,
                    'duration_hours': duration_hours,
                    'is_cancelled': is_cancelled,
                    'teacher_is_absent': is_absent,
                    'hourly_rate': float(teacher.hourly_rate),
                })
                
            current_day += timedelta(days=7)
            
    # Sort occurrences by date and time
    occurrences.sort(key=lambda x: (x['date'], x['start_time']))
    
    total_hours = sum(o['duration_hours'] for o in occurrences if not o['is_cancelled'])
    worked_hours = sum(o['duration_hours'] for o in occurrences if not o['is_cancelled'] and not o['teacher_is_absent'])
    total_expense = worked_hours * float(teacher.hourly_rate)
    
    return occurrences, total_hours, worked_hours, total_expense


def get_teacher_payroll_summary(occurrences, total_hours, worked_hours, total_expense, teacher):
    return {
        'total_sessions': len(occurrences),
        'cancelled_sessions': sum(1 for o in occurrences if o['is_cancelled']),
        'absent_sessions': sum(1 for o in occurrences if o['teacher_is_absent']),
        'total_hours': round(total_hours, 2),
        'worked_hours': round(worked_hours, 2),
        'hourly_rate': round(float(teacher.hourly_rate), 2),
        'total_expense': round(total_expense, 2),
    }


def _money(value):
    return Decimal(str(value)).quantize(Decimal('0.01'))


def serialize_teacher_payroll(payroll):
    if not payroll:
        return {
            'status': 'DRAFT',
            'id': None,
            'expense_id': None,
            'amount': 0,
        }

    return {
        'id': payroll.id,
        'status': payroll.status,
        'year': payroll.year,
        'month': payroll.month,
        'academic_year': payroll.academic_year_id,
        'teacher_id': payroll.teacher_id,
        'teacher_name': payroll.teacher.user.get_full_name() or payroll.teacher.user.username,
        'expense_id': payroll.expense_id,
        'expense_status': payroll.expense.status if payroll.expense else None,
        'expense_date': payroll.expense.date if payroll.expense else None,
        'total_sessions': payroll.total_sessions,
        'cancelled_sessions': payroll.cancelled_sessions,
        'absent_sessions': payroll.absent_sessions,
        'total_hours': float(payroll.total_hours),
        'worked_hours': float(payroll.worked_hours),
        'hourly_rate': float(payroll.hourly_rate),
        'amount': float(payroll.amount),
        'validated_at': payroll.validated_at,
        'reopened_at': payroll.reopened_at,
        'validated_by': payroll.validated_by_id,
        'validated_by_name': (
            payroll.validated_by.get_full_name() or payroll.validated_by.username
            if payroll.validated_by else None
        ),
        'reopened_by': payroll.reopened_by_id,
        'reopened_by_name': (
            payroll.reopened_by.get_full_name() or payroll.reopened_by.username
            if payroll.reopened_by else None
        ),
        'notes': payroll.notes,
        'updated_at': payroll.updated_at,
    }


def is_before_payroll_validation_day(year, month, today=None):
    today = today or timezone.now().date()
    return today < date(year, month, 28)


def get_teacher_monthly_payroll(teacher, year, month, academic_year):
    return TeacherMonthlyPayroll.objects.filter(
        teacher=teacher,
        academic_year=academic_year,
        year=year,
        month=month,
    ).select_related('expense', 'academic_year').first()


def get_teacher_payroll_history(teacher, academic_year=None):
    queryset = TeacherMonthlyPayroll.objects.filter(teacher=teacher).select_related(
        'expense',
        'academic_year',
        'teacher__user',
        'validated_by',
        'reopened_by',
    )
    if academic_year:
        queryset = queryset.filter(academic_year=academic_year)
    return [serialize_teacher_payroll(payroll) for payroll in queryset[:24]]


@transaction.atomic
def validate_teacher_monthly_payroll(teacher, year, month, academic_year, user=None, notes=''):
    occurrences, total_hours, worked_hours, total_expense = get_teacher_monthly_occurrences(
        teacher,
        year,
        month,
        academic_year,
    )
    summary = get_teacher_payroll_summary(occurrences, total_hours, worked_hours, total_expense, teacher)
    last_day = date(year, month, monthrange(year, month)[1])

    payroll, _ = TeacherMonthlyPayroll.objects.get_or_create(
        teacher=teacher,
        academic_year=academic_year,
        year=year,
        month=month,
        defaults={'status': 'DRAFT'},
    )

    amount = _money(summary['total_expense'])
    hourly_rate = _money(summary['hourly_rate'])
    description = (
        f"Salaire {teacher.user.get_full_name() or teacher.user.username} "
        f"- {year}-{month:02d} - {summary['worked_hours']:.2f}h x {summary['hourly_rate']:.2f} MAD"
    )

    expense = payroll.expense
    if expense:
        expense.description = description
        expense.amount = amount
        expense.date = last_day
        expense.category = 'SALARY'
        expense.save(update_fields=['description', 'amount', 'date', 'category'])
    else:
        expense = Expense.objects.create(
            description=description,
            amount=amount,
            date=last_day,
            category='SALARY',
            status='PENDING',
        )

    payroll.expense = expense
    payroll.status = 'VALIDATED'
    payroll.total_sessions = summary['total_sessions']
    payroll.cancelled_sessions = summary['cancelled_sessions']
    payroll.absent_sessions = summary['absent_sessions']
    payroll.total_hours = summary['total_hours']
    payroll.worked_hours = summary['worked_hours']
    payroll.hourly_rate = hourly_rate
    payroll.amount = amount
    payroll.validated_at = timezone.now()
    if user and user.is_authenticated:
        payroll.validated_by = user
    if notes:
        payroll.notes = notes
    payroll.save()

    return payroll, occurrences, summary


def validate_all_teacher_monthly_payrolls(year, month, academic_year, user=None, notes=''):
    from users.models import TeacherProfile

    results = []
    teachers = TeacherProfile.objects.filter(status='ACTIVE').select_related('user').order_by(
        'user__last_name',
        'user__first_name',
        'id',
    )

    for teacher in teachers:
        try:
            occurrences, total_hours, worked_hours, total_expense = get_teacher_monthly_occurrences(
                teacher,
                year,
                month,
                academic_year,
            )
            summary = get_teacher_payroll_summary(occurrences, total_hours, worked_hours, total_expense, teacher)

            if summary['total_sessions'] == 0:
                results.append({
                    'teacher_id': teacher.id,
                    'teacher_name': teacher.user.get_full_name() or teacher.user.username,
                    'status': 'SKIPPED',
                    'reason': 'No sessions for this month',
                    'summary': summary,
                })
                continue

            payroll, _, summary = validate_teacher_monthly_payroll(
                teacher,
                year,
                month,
                academic_year,
                user=user,
                notes=notes,
            )
            results.append({
                'teacher_id': teacher.id,
                'teacher_name': teacher.user.get_full_name() or teacher.user.username,
                'status': 'VALIDATED',
                'payroll': serialize_teacher_payroll(payroll),
                'summary': summary,
            })
        except Exception as exc:
            results.append({
                'teacher_id': teacher.id,
                'teacher_name': teacher.user.get_full_name() or teacher.user.username,
                'status': 'ERROR',
                'error': str(exc),
            })

    return results


@transaction.atomic
def reopen_teacher_monthly_payroll(teacher, year, month, academic_year, user=None):
    payroll = get_teacher_monthly_payroll(teacher, year, month, academic_year)
    if not payroll:
        occurrences, total_hours, worked_hours, total_expense = get_teacher_monthly_occurrences(
            teacher,
            year,
            month,
            academic_year,
        )
        summary = get_teacher_payroll_summary(occurrences, total_hours, worked_hours, total_expense, teacher)
        payroll = TeacherMonthlyPayroll.objects.create(
            teacher=teacher,
            academic_year=academic_year,
            year=year,
            month=month,
            total_sessions=summary['total_sessions'],
            cancelled_sessions=summary['cancelled_sessions'],
            absent_sessions=summary['absent_sessions'],
            total_hours=summary['total_hours'],
            worked_hours=summary['worked_hours'],
            hourly_rate=_money(summary['hourly_rate']),
            amount=_money(summary['total_expense']),
        )

    payroll.status = 'DRAFT'
    payroll.reopened_at = timezone.now()
    if user and user.is_authenticated:
        payroll.reopened_by = user
    payroll.save(update_fields=['status', 'reopened_at', 'reopened_by', 'updated_at'])
    return payroll
