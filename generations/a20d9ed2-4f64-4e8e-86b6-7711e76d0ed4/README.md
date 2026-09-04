# SmartCalc - Flask Calculator Application

A web-based scientific calculator application built with Flask, SQLite, and HTML5/CSS3/JavaScript.

## Features
- **Standard & Scientific Modes**: Switch between simple arithmetic and advanced functions (trigonometric, exponents, square root, logarithms, factorials).
- **Safe Evaluation**: Backed by a custom AST math parsing engine that safely processes mathematical inputs without raw `eval()`.
- **Calculation History**: Automatic SQLite persistent logging of calculations with one-click restore and full clear support.
- **Memory Register**: Standard memory store (`MC`, `MR`, `M+`, `M-`).
- **Theme Switcher**: Instant switching between Dark and Light UI themes.
- **Keyboard Shortcuts**: Complete support for numeric keypad and operator shortcuts.

## Installation & Setup

1. **Clone or extract project files** into your directory.

2. **Create and activate a virtual environment**:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Run the Flask application**:
```bash
python app.py
```

5. **Open in browser**:
Navigate to `http://127.0.0.1:5000/`.