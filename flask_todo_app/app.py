import os
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# In-memory storage and ID counter
todos = []
current_id = 0


@app.route('/')
def index():
    """
    Renders the main single-page HTML frontend.
    """
    return render_template('index.html')


@app.route('/todos', methods=['GET'])
def get_todos():
    """
    GET /todos
    Returns a list of all todo items in JSON format with status HTTP 200 OK.
    """
    return jsonify(todos), 200


@app.route('/todos', methods=['POST'])
def add_todo():
    """
    POST /todos
    Expects a JSON payload: {"title": "Task description"}
    Creates a new todo item and returns it with HTTP 201 Created.
    Returns HTTP 400 Bad Request if title is missing or invalid.
    """
    global current_id
    
    # Check for valid JSON payload
    data = request.get_json(silent=True)
    if not data or 'title' not in data or not str(data['title']).strip():
        return jsonify({'error': 'Title is required and must not be empty.'}), 400
    
    title = str(data['title']).strip()
    current_id += 1
    
    new_todo = {
        'id': current_id,
        'title': title,
        'completed': False
    }
    
    todos.append(new_todo)
    return jsonify(new_todo), 201


@app.route('/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id: int):
    """
    DELETE /todos/<id>
    Deletes the todo item matching the given integer ID.
    Returns HTTP 204 No Content on success.
    Returns HTTP 404 Not Found if no item matches the ID.
    """
    global todos
    target = next((item for item in todos if item['id'] == todo_id), None)
    
    if target is None:
        return jsonify({'error': f'Todo with id {todo_id} not found.'}), 404

    todos = [item for item in todos if item['id'] != todo_id]
    return '', 204


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
