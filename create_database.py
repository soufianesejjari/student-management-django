import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

DB_HOST = "wasel-dev-db.wasel.ma"
DB_PORT = 2234
DB_USER = "postgres"
DB_PASSWORD = "27ee227c7a566ac5"
NEW_DB_NAME = "postiz"

conn = psycopg2.connect(
    host=DB_HOST,
    port=DB_PORT,
    user=DB_USER,
    password=DB_PASSWORD,
    dbname="postgres",
)
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)

cur = conn.cursor()
cur.execute(f"SELECT 1 FROM pg_database WHERE datname = %s", (NEW_DB_NAME,))
exists = cur.fetchone()

if exists:
    print(f"Database '{NEW_DB_NAME}' already exists.")
else:
    cur.execute(f'CREATE DATABASE "{NEW_DB_NAME}"')
    print(f"Database '{NEW_DB_NAME}' created successfully.")

cur.close()
conn.close()
