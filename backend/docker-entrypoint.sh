#!/bin/sh
set -eu

PROCESS_TYPE="${PROCESS_TYPE:-all}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
GUNICORN_WORKERS="${GUNICORN_WORKERS:-4}"
GUNICORN_TIMEOUT="${GUNICORN_TIMEOUT:-120}"
CELERY_LOG_LEVEL="${CELERY_LOG_LEVEL:-info}"
CELERY_WORKER_CONCURRENCY="${CELERY_WORKER_CONCURRENCY:-2}"

run_migrations() {
  if [ "$RUN_MIGRATIONS" = "true" ] || [ "$RUN_MIGRATIONS" = "1" ]; then
    python manage.py migrate --noinput
  fi
}

start_web() {
  run_migrations
  exec gunicorn \
    --bind 0.0.0.0:8000 \
    --workers "$GUNICORN_WORKERS" \
    --timeout "$GUNICORN_TIMEOUT" \
    --access-logfile - \
    --error-logfile - \
    musical_academy.wsgi:application
}

start_worker() {
  exec celery -A musical_academy worker \
    -l "$CELERY_LOG_LEVEL" \
    --concurrency "$CELERY_WORKER_CONCURRENCY"
}

start_beat() {
  exec celery -A musical_academy beat \
    -l "$CELERY_LOG_LEVEL" \
    --scheduler django_celery_beat.schedulers:DatabaseScheduler
}

start_all() {
  run_migrations

  celery -A musical_academy worker \
    -l "$CELERY_LOG_LEVEL" \
    --concurrency "$CELERY_WORKER_CONCURRENCY" &
  worker_pid=$!

  celery -A musical_academy beat \
    -l "$CELERY_LOG_LEVEL" \
    --scheduler django_celery_beat.schedulers:DatabaseScheduler &
  beat_pid=$!

  stop_children() {
    kill "$worker_pid" "$beat_pid" 2>/dev/null || true
    wait "$worker_pid" "$beat_pid" 2>/dev/null || true
  }
  trap stop_children INT TERM EXIT

  gunicorn \
    --bind 0.0.0.0:8000 \
    --workers "$GUNICORN_WORKERS" \
    --timeout "$GUNICORN_TIMEOUT" \
    --access-logfile - \
    --error-logfile - \
    musical_academy.wsgi:application &
  web_pid=$!

  wait "$web_pid"
}

case "$PROCESS_TYPE" in
  web)
    start_web
    ;;
  worker)
    start_worker
    ;;
  beat)
    start_beat
    ;;
  all)
    start_all
    ;;
  *)
    exec "$@"
    ;;
esac
