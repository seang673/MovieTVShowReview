from flask import Flask, request, redirect, jsonify, session, render_template, url_for
import secrets
from flask_sqlalchemy import SQLAlchemy
from flask_wtf.csrf import CSRFProtect
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from database import conn, cursor  # Import DB connection
import psycopg2
from dotenv import load_dotenv

import os
from flask_wtf.csrf import CSRFProtect
from flask_wtf import FlaskForm
from wtforms import StringField, TextAreaField, HiddenField, IntegerField
from wtforms.validators import DataRequired

# ✅ Define Review Form
class ReviewForm(FlaskForm):
    movie_id = HiddenField("Movie ID")
    movie_title = HiddenField("Movie Title")
    review_text = TextAreaField("Review Text", validators=[DataRequired()])

#Load the environment variables
load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv("SECRET_KEY")
app.config['WTF_CSRF_SECRET_KEY'] = os.getenv("CSRF_SECRET_KEY")

db = SQLAlchemy(app)
csrf = CSRFProtect(app)  #Enables CSRF protection
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

#Define Review Model
class Review(db.Model):
    __tablename__ = "reviews"
    id = db.Column(db.Integer, primary_key=True)
    media_id = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    movie_title = db.Column(db.String(255), nullable=True)

    rating=db.Column(db.Integer, nullable=False)
    review_text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    user = db.relationship("User", back_populates="reviews")  # ✅ Establish relationship

    __table_args__ = (
        db.UniqueConstraint('media_id', 'user_id', name='unique_media_review'),
        db.CheckConstraint('rating BETWEEN 1 AND 5', name='valid_rating')
    )

class User(db.Model):  # ✅ Ensure correct naming matches PostgreSQL
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False, unique=True)
    email = db.Column(db.String(255), nullable=False, unique=True)
    password_hash = db.Column(db.Text, nullable=False)

    reviews = db.relationship("Review", back_populates="user", lazy=True)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ✅ Define Review Form (WTForms)
class ReviewForm(FlaskForm):
    movie_id = HiddenField("Movie ID")
    movie_title = HiddenField("Movie Title")
    review_text = TextAreaField("Review", validators=[DataRequired()])
    rating = IntegerField("Rating", validators=[DataRequired()])

class SavedMedia(db.Model):
    __tablename__ = "saved_media"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    media_id = db.Column(db.String(50), unique=True, nullable=False)
    title = db.Column(db.String(250), nullable=False)
    media_type = db.Column(db.String(50), nullable=False)
    release_date = db.Column(db.String(50), nullable=True)
    poster_url = db.Column(db.String(250), nullable=True)


def get_db_connection():
    return psycopg2.connect(
        os.environ["DATABASE_URL"]
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

@app.route("/submit_review", methods=["POST"])
def submit_review():
    try:
        data = request.get_json()
        if not data or "csrf_token" not in data:
            return jsonify({"error": "CSRF token missing"}), 400

        print("Received JSON:", data)  # ✅ Debugging step
        user_id = session.get("user_id")

        if not user_id:
            return jsonify({"error": "User not authenticated"}), 403


        media_id = data.get("media_id")
        media_title = data.get("movie_title")
        rating_value = data.get("rating")
        review_text = data.get("review_text")

        if not media_id or not rating_value or not review_text:
            return jsonify({"error": "Missing required fields"}), 400


        # ✅ Check if user already submitted a review for this media
        existing_review = Review.query.filter_by(media_id=media_id, user_id=user_id).first()
        if existing_review:
            existing_review.rating = rating_value
            existing_review.review_text = review_text
        else:
            new_review = Review(
                media_id=media_id,
                user_id=user_id,
                movie_title = media_title,
                rating=rating_value,
                review_text=review_text
            )
            db.session.add(new_review)

        db.session.commit()
        return jsonify({
            "success": True,
            "rating": rating_value,
            "review_text": review_text,
            "message": "Review submitted successfully!"
}), 200
    except Exception as e:
        print("Error:", str(e))  # ✅ Logs full error in terminal
        return jsonify({"error": str(e)}), 500



@app.route("/get_reviews/<media_id>", methods=["GET"])
def get_reviews(media_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT review_text, rating
        FROM reviews
        WHERE media_id = %s
        ORDER BY created_at DESC
    """, (media_id,))

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    reviews = [{"review_text": row[0], "rating": row[1]} for row in rows]

    return jsonify({"reviews": reviews})

import requests

API_KEY = "b63c63818bdd413db95bbdbc2e8298d9"

@app.route("/get_news")
def get_news():
    platforms = ["Neflix", "Hulu", "HBO", "Disney+", "Amazon Prime"]
    tv_news = []

    for platform in platforms:
        tv_url = f"https://newsapi.org/v2/everything?q={platform}&language=en&pageSize=15&apiKey={API_KEY}"
        response = requests.get(tv_url).json()
        tv_news.extend(response["articles"])

    tv_news = tv_news[:30]

    movie_url = f"https://newsapi.org/v2/everything?q=movies&language=en&pageSize=15&apiKey={API_KEY}"
    movie_response = requests.get(movie_url).json()

    return jsonify({"movies": movie_response["articles"], "tv_shows": tv_news})

@app.route("/save_media", methods=["POST"])
def save_media():
    try:
        data = request.get_json()
        print("Recieved JSON:", data)

        if not data or "csrf_token" not in data:
            print("Error: CSRF token missing")
            return jsonify({"error": "CSRF token missing"}), 400

        user_id = session.get("user_id")

        if not user_id:
            return jsonify({"error": "User not authenticated"}), 403

        new_media = SavedMedia(
            media_id = data.get("media_id"),
            title = data.get("title"),
            media_type = data.get("media_type"),
            release_date = data.get("release_date"),
            poster_url = data.get("poster_url"),
            user_id = user_id
        )
        db.session.add(new_media)
        db.session.commit()

        return jsonify({"message": "Media saved successfully!"}),200
    except Exception as e:
        print("Error:", str(e))  # ✅ Log error in terminal

        return jsonify({"error": str(e)}), 500

@app.route("/delete_review/<int:review_id>", methods=["POST"])
def delete_review(review_id):
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "User not authenticated"}), 403

    review = Review.query.get_or_404(review_id)
    if review.user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    db.session.delete(review)
    db.session.commit()
    return redirect(url_for("my_profile"))  # or wherever you want to go next

@app.route("/delete_saved_media/<int:media_id>", methods=["POST"])
def delete_saved_media(media_id):
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "User not authenticated"}), 403

    media = SavedMedia.query.get_or_404(media_id)
    if media.user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    db.session.delete(media)
    db.session.commit()
    return redirect(url_for("my_profile"))

#Ensures the database connection closes properly
@app.teardown_appcontext
def close_connection(exception=None):
    cursor.close()
    conn.close()
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

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
    user_id = session.get("user_id")
    form = ReviewForm()
    return render_template("discover.html", form=form, user_id=user_id)

@app.route("/profile")
def my_profile():
    user_id = session.get("user_id")
    reviews = Review.query.filter_by(user_id =user_id).all()
    saved = SavedMedia.query.filter_by(user_id=user_id).all()
    return render_template("profile.html", reviews=reviews, saved=saved)

@app.route("/upcoming")
def soonCome():
    return render_template("upcoming.html")

@app.route("/index")
def getIndex():
    return render_template("index.html")
@app.route("/news")
def getNews():
    return render_template("news.html")

@app.route("/search")
def search():
    return render_template("search.html")

@app.route("/logout")
def logout_account():
    session.clear()
    return redirect(url_for("login"))

@app.route("/")
def home():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
