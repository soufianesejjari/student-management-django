from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from users.models import StudentProfile, TeacherProfile, TeacherAvailability
from academics.models import AcademicYear, Subject, Course, Enrollment
from planning.models import Room, ClassSession
from finances.models import Payment, Expense
from datetime import date, time, timedelta, datetime
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with initial data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')
        
        # Clear existing data
        self.stdout.write('Clearing old data...')
        Payment.objects.all().delete()
        Expense.objects.all().delete()
        ClassSession.objects.all().delete()
        Enrollment.objects.all().delete()
        Course.objects.all().delete()
        Subject.objects.all().delete()
        Room.objects.all().delete()
        TeacherAvailability.objects.all().delete()
        TeacherProfile.objects.all().delete()
        StudentProfile.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        User.objects.filter(is_superuser=True).exclude(username='musicacadimie').delete()

        # 1. Create Superuser (if not exists)
        admin_username = 'musicacadimie'
        admin_password = 'Piano7572!'
        if not User.objects.filter(username=admin_username).exists():
            User.objects.create_superuser(admin_username, 'admin@example.com', admin_password)
            self.stdout.write(f'Created superuser: {admin_username}/{admin_password}')

        # Ensure there's an active academic year for enrollments
        academic_year, _ = AcademicYear.objects.get_or_create(
            name='2025-2026',
            defaults={
                'start_date': date(2025, 9, 1),
                'end_date': date(2026, 8, 31),
                'is_active': True,
            },
        )
        self.stdout.write(f'Using academic year: {academic_year.name}')

        # 2. Create Subjects
        subjects = {
            'Piano': '#3b82f6', 
            'Guitar': '#ef4444', 
            'Violin': '#10b981', 
            'Drums': '#f59e0b', 
            'Singing': '#8b5cf6', 
            'Saxophone': '#ec4899', 
            'Flute': '#06b6d4'
        }
        subject_objs = {}
        for name, color in subjects.items():
            subject_objs[name] = Subject.objects.create(name=name, color_code=color)
        self.stdout.write(f'Created {len(subjects)} subjects')

        # 3. Create Teachers
        teachers_data = [
            ('Marie', 'Dupont', 'Piano', 'marie@example.com'),
            ('Jean', 'Martin', 'Guitar', 'jean@example.com'),
            ('Sophie', 'Leclerc', 'Violin', 'sophie@example.com'),
            ('Pierre', 'Durand', 'Drums', 'pierre@example.com'),
            ('Isabelle', 'Lefebvre', 'Singing', 'isabelle@example.com'),
            ('François', 'Moreau', 'Saxophone', 'francois@example.com'),
            ('Claire', 'Rousseau', 'Flute', 'claire@example.com'),
        ]
        
        teacher_profiles = []
        for first, last, spec, email in teachers_data:
            user = User.objects.create_user(
                username=first.lower(),
                email=email,
                first_name=first,
                last_name=last,
                role=User.Role.TEACHER,
                is_active=False,
            )
            profile = TeacherProfile.objects.create(user=user, speciality=spec)
            teacher_profiles.append(profile)
            
            # Add availability
            # M-F 9-5
            for day in range(5):
                TeacherAvailability.objects.create(
                    teacher=profile, 
                    day_of_week=day, 
                    start_time=time(9,0), 
                    end_time=time(17,0)
                )

        self.stdout.write(f'Created {len(teacher_profiles)} teachers')

        # 4. Create Students
        students_data = [
            ('Emma', 'Martin', 'emma@example.com'),
            ('Lucas', 'Dubois', 'lucas@example.com'),
            ('Chloé', 'Petit', 'chloe@example.com'),
            ('Thomas', 'Bernard', 'thomas@example.com'),
            ('Léa', 'Moreau', 'lea@example.com'),
            ('Hugo', 'Leroy', 'hugo@example.com'),
            ('Manon', 'Roux', 'manon@example.com'),
            ('Nathan', 'Fournier', 'nathan@example.com'),
        ]
        
        student_profiles = []
        for first, last, email in students_data:
            user = User.objects.create_user(
                username=f"{first.lower()}{last.lower()}",
                email=email,
                first_name=first,
                last_name=last,
                role=User.Role.STUDENT,
                is_active=False,
            )
            profile = StudentProfile.objects.create(user=user)
            student_profiles.append(profile)
            
        self.stdout.write(f'Created {len(student_profiles)} students')

        # 5. Create Courses
        courses = []
        # Piano
        courses.append(Course.objects.create(name="Piano - Beginner", subject=subject_objs['Piano'], level='BEGINNER', default_teacher=teacher_profiles[0], price=50))
        courses.append(Course.objects.create(name="Piano - Intermediate", subject=subject_objs['Piano'], level='INTERMEDIATE', default_teacher=teacher_profiles[0], price=75))
        # Guitar
        courses.append(Course.objects.create(name="Guitar - Beginner", subject=subject_objs['Guitar'], level='BEGINNER', default_teacher=teacher_profiles[1], price=50))
        # Violin
        courses.append(Course.objects.create(name="Violin - Advanced", subject=subject_objs['Violin'], level='ADVANCED', default_teacher=teacher_profiles[2], price=90))
        
        self.stdout.write(f'Created {len(courses)} courses')

        # 6. Enrollments
        for student in student_profiles:
            # Enroll in 1 random course
            course = random.choice(courses)
            Enrollment.objects.create(student=student, course=course, academic_year=academic_year, default_price=course.price, custom_price=course.price)
            
        # 7. Rooms
        rooms = [
            Room.objects.create(name="Salle 1", resources="Grand Piano"),
            Room.objects.create(name="Salle 2", resources="Amps, Drums"),
            Room.objects.create(name="Salle 3", resources="Music Stands"),
            Room.objects.create(name="Auditorium", capacity=50),
        ]
        self.stdout.write(f'Created {len(rooms)} rooms')

        # 8. Sessions (Weekly Schedule)
        # Create a session for each course
        days = [0, 1, 2, 3, 4] # Mon-Fri
        
        for i, course in enumerate(courses):
            room = rooms[i % len(rooms)]
            day = days[i % len(days)]
            start_hour = 10 + i
            start_t = time(start_hour, 0)
            end_t = time(start_hour + 1, 0)
            
            ClassSession.objects.create(
                course=course,
                teacher=course.default_teacher,
                room=room,
                day_of_week=day,
                start_time=start_t,
                end_time=end_t,
                start_date=date.today(),
                end_date=min(date.today() + timedelta(days=90), academic_year.end_date)
            )
            
        self.stdout.write('Created sessions')

        # 9. Finances
        # Payments
        for student in student_profiles:
            Payment.objects.create(
                student=student,
                amount=50.00,
                date=date.today() - timedelta(days=random.randint(1, 30)),
                method='CARD',
                status='PAID',
                invoice_ref=f"INV-{random.randint(1000, 9999)}"
            )

        # Expenses
        Expense.objects.create(description="Rent - April", amount=2500, date=date.today() - timedelta(days=15), category='RENT', status='PAID')
        Expense.objects.create(description="Electricity", amount=350, date=date.today() - timedelta(days=10), category='UTILITIES', status='PAID')
        Expense.objects.create(description="Piano Tuning", amount=150, date=date.today() - timedelta(days=5), category='MAINTENANCE', status='PAID')

        self.stdout.write(self.style.SUCCESS('Successfully seeded database!'))
