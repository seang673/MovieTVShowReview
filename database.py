import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

#Database connection settings

DB_NAME = "movie_review_platform"
DB_USER = "postgres"
DB_PASSWORD = "CrazySMG19!"
DB_HOST = "localhost"
DB_PORT = "5432"

#Establish connection

conn = psycopg2.connect(
    os.getenv("DATABASE_URL")
)

# Create a cursor to execute SQL queries
cursor = conn.cursor()

print("Database connected successfully!")