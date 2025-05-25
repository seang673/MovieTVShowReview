import psycopg2

#Database connection settings

DB_NAME = "movie_review_platform"
DB_USER = "postgres"
DB_PASSWORD = "CrazySMG19!"
DB_HOST = "localhost"
DB_PORT = "5432"

#Establish connection

conn = psycopg2.connect(
    dbname = DB_NAME,
    user = DB_USER,
    password = DB_PASSWORD,
    host = DB_HOST,
    port = DB_PORT
)

# Create a cursor to execute SQL queries
cursor = conn.cursor()

print("Database connected successfully!")