import ast
import math
import operator
from datetime import datetime
from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///calculator.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ------------------------------------------------------------------
# Database Models
# ------------------------------------------------------------------
class CalculationHistory(db.Model):
    __tablename__ = 'calculation_history'
    
    id = db.Column(db.Integer, primary_key=True)
    expression = db.Column(db.String(255), nullable=False)
    result = db.Column(db.String(100), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'expression': self.expression,
            'result': self.result,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        }

with app.app_context():
    db.create_all()

# ------------------------------------------------------------------
# Safe AST Expression Evaluator
# ------------------------------------------------------------------
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

FUNCTIONS = {
    'sqrt': math.sqrt,
    'sin': math.sin,
    'cos': math.cos,
    'tan': math.tan,
    'asin': math.asin,
    'acos': math.acos,
    'atan': math.atan,
    'log': math.log10,
    'ln': math.log,
    'exp': math.exp,
    'abs': abs,
    'factorial': math.factorial,
}

CONSTANTS = {
    'pi': math.pi,
    'e': math.e,
}

def safe_eval(expr_str):
    """
    Safely evaluate arithmetic & scientific expressions using Python's AST parser.
    Prevents execution of arbitrary Python code.
    """
    if not expr_str or not expr_str.strip():
        raise ValueError("Expression is empty")
        
    # Replace visual representation operators with Python syntax
    sanitized = expr_str.replace('×', '*').replace('÷', '/').replace('^', '**')
    
    try:
        tree = ast.parse(sanitized, mode='eval')
    except Exception as e:
        raise ValueError("Invalid mathematical syntax")

    def _eval_node(node):
        if isinstance(node, ast.Expression):
            return _eval_node(node.body)
            
        elif isinstance(node, ast.Constant): # Python 3.8+
            if isinstance(node.value, (int, float)):
                return node.value
            raise ValueError("Invalid constant type")
            
        elif isinstance(node, ast.Num): # Python < 3.8 fallback
            return node.n
            
        elif isinstance(node, ast.BinOp):
            op_type = type(node.op)
            if op_type not in OPERATORS:
                raise ValueError(f"Unsupported operator: {op_type.__name__}")
            left = _eval_node(node.left)
            right = _eval_node(node.right)
            if op_type == ast.Div and right == 0:
                raise ZeroDivisionError("Division by zero")
            return OPERATORS[op_type](left, right)
            
        elif isinstance(node, ast.UnaryOp):
            op_type = type(node.op)
            if op_type not in OPERATORS:
                raise ValueError(f"Unsupported unary operator: {op_type.__name__}")
            operand = _eval_node(node.operand)
            return OPERATORS[op_type](operand)
            
        elif isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name):
                raise ValueError("Function call must be a direct identifier")
            func_name = node.func.id.lower()
            if func_name not in FUNCTIONS:
                raise ValueError(f"Unsupported function: '{func_name}'")
            args = [_eval_node(arg) for arg in node.args]
            return FUNCTIONS[func_name](*args)
            
        elif isinstance(node, ast.Name):
            var_name = node.id.lower()
            if var_name in CONSTANTS:
                return CONSTANTS[var_name]
            raise ValueError(f"Unknown variable or constant: '{node.id}'")
            
        else:
            raise ValueError(f"Unsupported operation in expression")

    return _eval_node(tree)

# ------------------------------------------------------------------
# Web Routes & API Endpoints
# ------------------------------------------------------------------
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/calculate', methods=['POST'])
def calculate():
    data = request.get_json() or {}
    expression = data.get('expression', '').strip()

    if not expression:
        return jsonify({'status': 'error', 'message': 'Please enter an expression.'}), 400

    try:
        raw_result = safe_eval(expression)
        
        # Format floating point numbers to prevent precision clutter
        if isinstance(raw_result, float):
            if raw_result.is_integer():
                formatted_result = str(int(raw_result))
            else:
                formatted_result = f"{raw_result:.8g}"
        else:
            formatted_result = str(raw_result)

        # Save calculation to SQLite DB
        record = CalculationHistory(expression=expression, result=formatted_result)
        db.session.add(record)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'expression': expression,
            'result': formatted_result,
            'id': record.id
        })

    except ZeroDivisionError:
        return jsonify({'status': 'error', 'message': 'Cannot divide by zero'}), 400
    except ValueError as ve:
        return jsonify({'status': 'error', 'message': str(ve)}), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': 'Calculation error occurred'}), 400

@app.route('/api/history', methods=['GET'])
def get_history():
    records = CalculationHistory.query.order_by(CalculationHistory.timestamp.desc()).limit(30).all()
    return jsonify([r.to_dict() for r in records])

@app.route('/api/history', methods=['DELETE'])
def clear_history():
    try:
        db.session.query(CalculationHistory).delete()
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Calculation history cleared'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': 'Failed to clear history'}), 500

@app.route('/api/history/<int:item_id>', methods=['DELETE'])
def delete_history_item(item_id):
    item = CalculationHistory.query.get(item_id)
    if not item:
        return jsonify({'status': 'error', 'message': 'Item not found'}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({'status': 'success', 'message': f'Item {item_id} deleted'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)