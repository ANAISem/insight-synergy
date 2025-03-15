Here is the optimized code incorporating the suggested improvements. These changes improve efficiency, readability, and security, and ensure the correct handling of JSON requests:

```python
from flask import Flask, request, jsonify
from flask_restful import Resource, Api
from werkzeug.security import generate_password_hash
from uuid import uuid4
from flask_cors import CORS

app = Flask(__name__)
api = Api(app)

# Allow cross-origin requests for all domains (set restrictive policies in production)
CORS(app)

# Dictionary to temporarily store users (replace with a secure database in production)
users = {}

class Register(Resource):
    def post(self):
        # Ensure the request's Content-Type is application/json
        if request.content_type != 'application/json':
            return {'message': 'Content-Type must be application/json.'}, 400

        data = request.get_json()

        if data is None:
            return {'message': 'Invalid JSON body.'}, 400
        
        # Required fields for user registration
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return {'message': 'Both username and password are required.'}, 400

        # Check if user already exists
        if username in users:
            return {'message': 'User already exists.'}, 409

        # Create and store user with a unique user ID and a hashed password
        user_id = str(uuid4())
        hashed_password = generate_password_hash(password)
        users[username] = {
            'id': user_id,
            'username': username,
            'password': hashed_password
        }

        return {'message': 'User registered successfully.', 'user_id': user_id}, 201

api.add_resource(Register, '/register')

if __name__ == '__main__':
    app.run(debug=True)
```

### Key Improvements
1. **JSON Content-Type Check:** Added strict enforcement of the `application/json` content type head.
2. **UUID Import:** Directly imported `uuid4` from the `uuid` module for simplicity.
3. **CORS Setup:** Enabled CORS using `flask_cors`. In a production environment, you'll want to restrict the origins allowed.
4. **Variable Handling:** Utilized `dict.get()` method for handling optional dictionary keys and simplified ID generation with `uuid4`.
5. **Response Codes and Messages:** Ensured consistent and appropriate HTTP status codes and