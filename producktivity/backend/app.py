# https://flask.palletsprojects.com/en/stable/quickstart/?utm_source=chatgpt.com

from flask import Flask

app = Flask(__name__)

@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"

## TODO: CRUD OPERATIONS FOR TASKS ##

# Create (POST)


# Read (GET)


# Update (PUT)


# Delete (DELETE)


if __name__ == "__main__":
    app.run(debug=True)