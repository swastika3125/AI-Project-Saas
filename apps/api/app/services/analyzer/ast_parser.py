import ast
from typing import Dict, List, Set, Any, Optional
from pydantic import BaseModel, ConfigDict


class FunctionInfo(BaseModel):
    name: str
    class_name: Optional[str] = None
    file_path: str
    start_line: int
    end_line: int
    calls: Set[str] = set()
    docstring: Optional[str] = None

    model_config = ConfigDict(arbitrary_types_allowed=True)


class FileASTSummary(BaseModel):
    file_path: str
    functions: Dict[str, FunctionInfo] = {}
    imports: Set[str] = set()
    classes: Set[str] = set()

    model_config = ConfigDict(arbitrary_types_allowed=True)


class ASTCallExtractor(ast.NodeVisitor):
    def __init__(self):
        self.calls: Set[str] = set()

    def visit_Call(self, node: ast.Call):
        func_name = None
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
        elif isinstance(node.func, ast.Attribute):
            func_name = node.func.attr
        if func_name:
            self.calls.add(func_name)
        self.generic_visit(node)


def parse_python_module(file_path: str, source_code: str) -> FileASTSummary:
    summary = FileASTSummary(file_path=file_path)

    try:
        tree = ast.parse(source_code, filename=file_path)
    except SyntaxError:
        return summary

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                summary.imports.add(alias.name)
        elif isinstance(node, ast.ImportFrom):
            mod = node.module or ""
            for alias in node.names:
                summary.imports.add(f"{mod}.{alias.name}")

    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            extractor = ASTCallExtractor()
            extractor.visit(node)
            summary.functions[node.name] = FunctionInfo(
                name=node.name,
                class_name=None,
                file_path=file_path,
                start_line=node.lineno,
                end_line=node.end_lineno or node.lineno,
                calls=extractor.calls,
                docstring=ast.get_docstring(node)
            )
        elif isinstance(node, ast.ClassDef):
            summary.classes.add(node.name)
            for item in node.body:
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    extractor = ASTCallExtractor()
                    extractor.visit(item)
                    full_name = f"{node.name}.{item.name}"
                    summary.functions[full_name] = FunctionInfo(
                        name=item.name,
                        class_name=node.name,
                        file_path=file_path,
                        start_line=item.lineno,
                        end_line=item.end_lineno or item.lineno,
                        calls=extractor.calls,
                        docstring=ast.get_docstring(item)
                    )

    return summary
