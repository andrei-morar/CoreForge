from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# In-memory storage for todos
todos = [
    {"id": 1, "task": "Learn Python Flask"},
    {"id": 2, "task": "Build a Todo App"}
]
next_id = 3


@app.route('/')
def index():
    """Render the main application frontend."""
    return render_template('index.html')


@app.route('/todos', methods=['GET'])
def get_todos():
    """Endpoint: GET /todos - Returns all todo items as JSON."""
    return jsonify(todos), 200


@app.route('/todos', methods=['POST'])
def add_todo():
    """Endpoint: POST /todos - Adds a new todo item."""
    global next_id
    data = request.get_json(silent=True) or {}
    task_text = data.get('task', '').strip()

    if not task_text:
        return jsonify({"error": "Task description cannot be empty."}), 400

    new_todo = {
        "id": next_id,
        "task": task_text
    }
    next_id += 1
    todos.append(new_todo)

    return jsonify(new_todo), 201


@app.route('/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    """Endpoint: DELETE /todos/<id> - Deletes a todo item by ID."""
    global todos
    for index, item in enumerate(todos):
        if item['id'] == todo_id:
            deleted_item = todos.pop(index)
            return jsonify({
                "message": f"Todo with id {todo_id} deleted successfully.",
                "deleted": deleted_item
            }), 200

    return jsonify({"error": f"Todo with id {todo_id} not found."}), 404


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)