import ast
import math
import operator
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Global state for history and memory storage
history_log = []
memory_value = 0.0

# Supported binary and unary operators mapping
OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

# Supported functions
FUNCTIONS = {
    'sqrt': math.sqrt,
    'sin': lambda x: math.sin(math.radians(x)),
    'cos': lambda x: math.cos(math.radians(x)),
    'tan': lambda x: math.tan(math.radians(x)),
    'log': math.log10,
    'ln': math.log,
    'abs': abs,
    'fact': math.factorial,
    'factorial': math.factorial,
    'ceil': math.ceil,
    'floor': math.floor,
}

# Supported constants
CONSTANTS = {
    'pi': math.pi,
    'π': math.pi,
    'e': math.e,
}

def safe_eval(expr_str):
    """
    Safely evaluate a mathematical expression using AST parsing.
    """
    if not expr_str or not expr_str.strip():
        raise ValueError("Empty expression")

    # Standardize operators and symbols
    normalized = expr_str.replace('×', '*').replace('÷', '/').replace('^', '**').replace('√', 'sqrt')
    
    # Custom implicit multiplication handling (e.g. 2pi -> 2*pi, 3sqrt(4) -> 3*sqrt(4))
    # Replace common patterns
    normalized = normalized.replace('π', 'pi')
    
    def _eval(node):
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        elif isinstance(node, ast.Constant): # Python 3.8+
            if isinstance(node.value, (int, float)):
                return node.value
            raise ValueError(f"Invalid constant type")
        elif isinstance(node, ast.Num): # Python <3.8 fallback
            return node.n
        elif isinstance(node, ast.Name):
            if node.id.lower() in CONSTANTS:
                return CONSTANTS[node.id.lower()]
            raise ValueError(f"Unknown variable: '{node.id}'")
        elif isinstance(node, ast.BinOp):
            left = _eval(node.left)
            right = _eval(node.right)
            op_type = type(node.op)
            if op_type in OPERATORS:
                if op_type == ast.Div and right == 0:
                    raise ZeroDivisionError("Cannot divide by zero")
                return OPERATORS[op_type](left, right)
            raise ValueError(f"Unsupported binary operator")
        elif isinstance(node, ast.UnaryOp):
            operand = _eval(node.operand)
            op_type = type(node.op)
            if op_type in OPERATORS:
                return OPERATORS[op_type](operand)
            raise ValueError(f"Unsupported unary operator")
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                func_name = node.func.id.lower()
                if func_name in FUNCTIONS:
                    args = [_eval(arg) for arg in node.args]
                    return FUNCTIONS[func_name](*args)
            raise ValueError("Unsupported function call")
        else:
            raise ValueError("Invalid mathematical syntax")

    parsed = ast.parse(normalized, mode='eval')
    return _eval(parsed)

def format_result(val):
    """Format float or integer for clean display."""
    if isinstance(val, float):
        if val.is_integer():
            return int(val)
        return round(val, 10)
    return val

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/calculate', methods=['POST'])
def calculate():
    global history_log
    data = request.get_json() or {}
    expression = data.get('expression', '').strip()

    if not expression:
        return jsonify({'status': 'error', 'message': 'Expression cannot be empty'}), 400

    try:
        raw_result = safe_eval(expression)
        result = format_result(raw_result)

        entry = {
            'expression': expression,
            'result': result
        }
        history_log.insert(0, entry)
        if len(history_log) > 20:  # Retain top 20 recent calculations
            history_log.pop()

        return jsonify({
            'status': 'success',
            'expression': expression,
            'result': result
        })
    except ZeroDivisionError as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400
    except ValueError as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400
    except Exception:
        return jsonify({'status': 'error', 'message': 'Invalid Syntax'}), 400

@app.route('/api/history', methods=['GET'])
def get_history():
    return jsonify({'status': 'success', 'history': history_log})

@app.route('/api/history/clear', methods=['POST'])
def clear_history():
    global history_log
    history_log = []
    return jsonify({'status': 'success', 'message': 'History cleared', 'history': []})

@app.route('/api/memory', methods=['POST'])
def handle_memory():
    global memory_value
    data = request.get_json() or {}
    action = data.get('action')
    val = float(data.get('value', 0) or 0)

    if action == 'mc':
        memory_value = 0.0
    elif action == 'ms':
        memory_value = val
    elif action == 'm+':
        memory_value += val
    elif action == 'm-':
        memory_value -= val

    return jsonify({'status': 'success', 'memory': format_result(memory_value)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)