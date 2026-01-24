# Docker Setup & Usage Guide

## Backend Setup

### Quick Start with Docker Compose

1. **Build and run all services:**
   ```bash
   docker-compose up --build
   ```

2. **Run migrations:**
   ```bash
   docker-compose exec backend python manage.py migrate
   ```

3. **Create superuser:**
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

4. **Load seed data (optional):**
   ```bash
   docker-compose exec backend python manage.py seed_db
   ```

### Services Overview

- **Backend**: Django REST API on `http://localhost:8009` (exposed on host)
- **Frontend**: Next.js on `http://localhost:3000`
- **Database**: PostgreSQL on `localhost:5432`

### Manual Docker Build

**Build backend image:**
```bash
docker build -t musical-academy-backend:latest ./backend
```

**Run backend container:**
```bash
docker run -d \
  --name musical_academy_backend \
  -p 8009:8000 \
  -e DEBUG=True \
  -e SECRET_KEY="your-secret-key" \
  -e DATABASE_URL="postgresql://user:password@db:5432/musical_academy" \
  -v $(pwd)/backend:/app \
  musical-academy-backend:latest
```

## Production Deployment

### Environment Variables (Production)

Create a `.env` file in the backend directory:
```
DEBUG=False
SECRET_KEY=<generate-secure-random-key>
DATABASE_URL=postgresql://user:password@host:5432/database
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

### Docker Build for Production

```bash
docker build -t musical-academy-backend:production ./backend
```

### Docker Network

All services use the default docker-compose network. They communicate using service names:
- Backend: `http://backend:8000`
- Database: `db:5432`

## Common Commands

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f db
```

### Stop services
```bash
docker-compose down
```

### Stop and remove volumes
```bash
docker-compose down -v
```

### Execute Django management commands
```bash
docker-compose exec backend python manage.py <command>
```

### Access Django shell
```bash
docker-compose exec backend python manage.py shell
```

### Access database
```bash
docker-compose exec db psql -U academy -d musical_academy
```

## Development vs Production

### Development (docker-compose.yml)
- Uses SQLite or PostgreSQL
- Hot-reload enabled for code changes
- Debug mode ON
- Exposes all ports

### Production Dockerfile
- Multi-stage build for smaller image
- Non-root user for security
- Gunicorn WSGI server
- Health checks included
- Requires PostgreSQL
- Should be behind reverse proxy (nginx)

## Troubleshooting

### Port already in use
```bash
# Find process using port
lsof -i :8009

# Kill process
kill -9 <PID>
```

### Database connection errors
```bash
# Check database status
docker-compose ps db

# View database logs
docker-compose logs db
```

### Permission denied errors
```bash
# Rebuild without cache
docker-compose build --no-cache
```

## Security Notes

1. Change `SECRET_KEY` in production
2. Use strong database password
3. Set `DEBUG=False` in production
4. Use environment-specific `.env` files
5. Never commit `.env` files to version control
6. Use HTTPS in production
7. Configure proper ALLOWED_HOSTS
8. Use secret management tools (AWS Secrets Manager, HashiCorp Vault, etc.)
