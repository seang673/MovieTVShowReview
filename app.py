from flask import Flask, request, redirect, jsonify, session, render_template, url_for
import secrets
from flask_sqlalchemy import SQLAlchemy
from flask_wtf.csrf import CSRFProtect
from werkzeug.security import generate_password_hash, check_password_hash
from database import conn, cursor  # Import DB connection
import psycopg2
from dotenv import load_dotenv

import os
from flask_wtf.csrf import CSRFProtect
from flask_wtf import FlaskForm
from wtforms import StringField, TextAreaField, HiddenField
from wtforms.validators import DataRequired


# ✅ Define Review Form
class ReviewForm(FlaskForm):
    csrf_token = HiddenField()
    movie_id = StringField("Movie ID", validators=[DataRequired()])
    movie_title = StringField("Movie Title", validators=[DataRequired()])
    review_text = TextAreaField("Review Text", validators=[DataRequired()])



#Load the environment variables
load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL")
app.config['SECRET_KEY'] = os.getenv("SECRET_KEY")
app.config['WTF_CSRF_SECRET_KEY'] = os.getenv("CSRF_SECRET_KEY")

db = SQLAlchemy(app)
csrf = CSRFProtect(app)

#Define Review Model
class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    movie_id = db.Column(db.String(50), nullable=False)
    movie_title = db.Column(db.String(150), nullable=False)
    review_text = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    timestamp = db.Column(db.DateTime, server_default=db.func.current_timestamp())

class Users(db.Model):  # ✅ Ensure correct naming matches PostgreSQL
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False, unique=True)
    email = db.Column(db.String(255), nullable=False, unique=True)
    password_hash = db.Column(db.Text, nullable=False)
    reviews = db.relationship("Review", backref="user", lazy=True)


# ✅ Define Review Form (WTForms)
class ReviewForm(FlaskForm):
    csrf_token = HiddenField()
    movie_id = StringField("Movie ID", validators=[DataRequired()])
    movie_title = StringField("Movie Title", validators=[DataRequired()])
    review_text = TextAreaField("Review Text", validators=[DataRequired()])



def get_db_connection():
    return psycopg2.connect(
        dbname="movie_review_platform",
        user="postgres",
        password="CrazySMG19!",
        host="localhost",
        port="5432"
    )

#Signup Route
@app.route("/signup", methods=["GET","POST"])
def signup():
    if request.method == "POST":
        username = request.form["username"]
        email = request.form["email"]
        password = generate_password_hash(request.form["password"])

        conn = get_db_connection()
        cursor = conn.cursor()

        try:
             cursor.execute("INSERT INTO users (username, password_hash, email ) VALUES (%s, %s, %s)", (username, password, email))
             conn.commit()
             return render_template("login.html")
        except Exception as e:
            conn.rollback()
            return f"Error: {str(e)}"
        finally:
            cursor.close()
            conn.close()

    return render_template("signup.html")

#Login Route
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id, password_hash FROM users WHERE username=%s", (username,))
        user = cursor.fetchone()

        print("Retrived User Data:", user)

        if user and check_password_hash(user[1], password):
            session["user_id"] = user[0]

            cursor.close()
            conn.close()
            return redirect(url_for("main"))

        cursor.close()
        conn.close()
        return "Invalid credentials"

    return render_template("login.html")

#Logout Route
@app.route("/logout")
def logout():
    session.pop("user", None)
    return render_template("login.html")

#Rate movies
@app.route("/rate_movie", methods=["POST"])
def rate_movie():
    if "user_id" not in session:
        return jsonify({"error": "User not logged in"}), 403

    data = request.json
    movie_id = data.get("movie_id")
    rating = data.get("rating")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
                   INSERT INTO ratings(user_id, movie_id, rating)
                   VALUES (%s, %s, %s)
                   ON CONFLICT (user_id, movie_id)
                   DO UPDATE SET rating = EXCLUDED.rating;
                   """, (session["user_id"], movie_id, rating))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"success": True})

@app.route("/get_user_rating/<int:movie_id>")
def get_user_rating(movie_id):
    if "user_id" not in session:
        return jsonify({"error": "User not logged in"}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT rating FROM ratings WHERE movie_id = %s AND user_id = %s", (movie_id, session["user_id"]))
    user_rating = cursor.fetchone()

    cursor.close()
    conn.close()

    return jsonify({"user_rating": user_rating[0] if user_rating else None})



@app.route("/submit_review", methods=["POST"])
def submit_review():
    form = ReviewForm()

    if form.validate_on_submit():
        new_review = Review(
            movie_id=form.movie_id.data,
            movie_title=form.movie_title.data,
            review_text=form.review_text.data,
            user_id=session.get("user_id"),
            timestamp=db.func.current_timestamp()
        )

        db.session.add(new_review)
        db.session.commit()
        return jsonify({
            "success": True,
            "movie_id": new_review.movie_id,
            "review_text": new_review.review_text,
            "movie_title": new_review.movie_title
        })  # ✅ Returns review data instead of redirecting



    return jsonify({"success": False, "error": "Invalid form submission"})



@app.route("/get_reviews/<movie_id>", methods=["GET"])
def get_reviews(movie_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT review_text FROM review WHERE movie_id=%s ORDER BY timestamp DESC", (movie_id,))
    reviews = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify({"reviews": [review[0] for review in reviews]})

import requests

API_KEY = "b63c63818bdd413db95bbdbc2e8298d9"

@app.route("/get_news")
def get_news():
    platforms = ["Neflix", "Hulu", "HBO", "Disney+", "Amazon Prime"]
    tv_news = []

    for platform in platforms:
        tv_url = f"https://newsapi.org/v2/everything?q={platform}&language=en&pageSize=30&apiKey={API_KEY}"
        response = requests.get(tv_url).json()
        tv_news.extend(response["articles"])

    tv_news = tv_news[:30]

    movie_url = f"https://newsapi.org/v2/everything?q=movies&language=en&pageSize=30&apiKey={API_KEY}"
    movie_response = requests.get(movie_url).json()


    return jsonify({"movies": movie_response["articles"], "tv_shows": tv_news})



#Ensures the database connection closes properly
@app.teardown_appcontext
def close_connection(exception=None):
    cursor.close()
    conn.close()

@app.before_request
def set_csrf_token():
    if '_csrf_token' not in session:
        session['_csrf_token'] = secrets.token_hex(16)  # ✅ Generates secure random CSRF token



@app.route("/debug_session")
def debug_session():
    return jsonify(dict(session))


@app.route("/main")
def main():
    if "user_id" in session:
        return render_template("main.html")
    return redirect(url_for("login"))

@app.route("/discover", methods=["GET", "POST"])
def discover():
    form = ReviewForm()
    return render_template("discover.html", form=form)

@app.route("/upcoming")
def soonCome():
    return render_template("upcoming.html")

@app.route("/news")
def getNews():
    return render_template("news.html")

@app.route("/search")
def search():
    return render_template("search.html")

@app.route("/")
def home():
    return render_template("login.html")

if __name__ == "__main__":
    app.run(debug=True)
