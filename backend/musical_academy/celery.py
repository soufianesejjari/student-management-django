"""Celery application for the Musical Academy project."""
import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'musical_academy.settings')

app = Celery('musical_academy')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
