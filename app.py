from flask import Flask, request, send_file, render_template_string
from pathlib import Path
import tempfile

from src.redactor import redact_document


app = Flask(__name__)


HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>PII Redaction Tool</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 700px;
            margin: 60px auto;
            padding: 20px;
        }

        h1 {
            margin-bottom: 10px;
        }

        .box {
            border: 1px solid #ddd;
            padding: 25px;
            border-radius: 10px;
        }

        input {
            margin: 20px 0;
        }

        button {
            padding: 10px 18px;
            cursor: pointer;
        }
    </style>
</head>

<body>

<div class="box">

<h1>PII Redaction Tool</h1>

<p>
Upload a DOCX document and the tool will detect and redact
supported personally identifiable information.
</p>

<form method="POST" enctype="multipart/form-data">

<input
    type="file"
    name="document"
    accept=".docx"
    required
>

<br>

<button type="submit">
    Redact Document
</button>

</form>

</div>

</body>
</html>
"""


@app.route("/", methods=["GET", "POST"])
def index():

    if request.method == "GET":
        return render_template_string(HTML)

    uploaded_file = request.files.get("document")

    if not uploaded_file:
        return "No document uploaded.", 400

    if not uploaded_file.filename.lower().endswith(".docx"):
        return "Only DOCX files are supported.", 400

    temp_dir = Path(tempfile.mkdtemp())

    input_file = temp_dir / "input.docx"
    output_file = temp_dir / "redacted_document.docx"

    try:
        uploaded_file.save(input_file)

        redact_document(
            input_file,
            output_file
        )

        # Read the completed DOCX into memory before
        # deleting the temporary directory.
        with open(output_file, "rb") as file:
            file_data = file.read()

        from io import BytesIO

        return send_file(
            BytesIO(file_data),
            as_attachment=True,
            download_name="redacted_document.docx",
            mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

    finally:
        # Clean up temporary files after the response data
        # has been loaded into memory.
        try:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )