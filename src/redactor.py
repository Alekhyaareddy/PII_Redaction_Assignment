import re
from pathlib import Path
from docx import Document


# ============================================================
# FILE PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

INPUT_FILE = BASE_DIR / "input" / "Red Herring Prospectus.docx"
OUTPUT_FILE = BASE_DIR / "output" / "redacted_prospectus.docx"


# ============================================================
# PII PATTERNS
# ============================================================

EMAIL_PATTERN = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
)


PHONE_PATTERN = re.compile(
    r"""
    (?<!\d)
    (?:
        \+?91[\s-]?
        (?:
            [6-9]\d{9}
            |
            \d{2}[\s-]?\d{4}[\s-]?\d{4}
            |
            \d{2}[\s-]?\d{8}
        )
        |
        [6-9]\d{9}
        |
        0\d{2,4}[\s-]\d{6,8}
    )
    (?!\d)
    """,
    re.VERBOSE
)


IP_PATTERN = re.compile(
    r"""
    (?<![\d.])
    (?:
        (?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)
        \.
        (?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)
        \.
        (?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)
        \.
        (?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)
    )
    (?![\d.])
    """,
    re.VERBOSE
)


SSN_PATTERN = re.compile(
    r"(?<!\d)(?!000|666|9\d\d)\d{3}[- ]\d{2}[- ]\d{4}(?!\d)"
)


DOB_PATTERN = re.compile(
    r"""
    (?ix)
    (?:
        date\s+of\s+birth
        |
        d\.?o\.?b\.?
        |
        birth\s+date
    )
    \s*[:=-]?\s*
    (
        \d{1,2}[/-]\d{1,2}[/-]\d{2,4}
        |
        \d{1,2}\s+
        (?:January|February|March|April|May|June|July|August|
        September|October|November|December)
        \s+\d{4}
        |
        (?:January|February|March|April|May|June|July|August|
        September|October|November|December)
        \s+\d{1,2},?\s+\d{4}
    )
    """,
    re.VERBOSE
)


# ============================================================
# REPLACEMENT COUNTERS
# ============================================================

replacement_counters = {
    "email": 0,
    "phone": 0,
    "ip": 0,
    "ssn": 0,
    "dob": 0,
}


# ============================================================
# REPLACEMENT FUNCTION
# ============================================================

def get_replacement(category):
    replacement_counters[category] += 1

    return f"[REDACTED_{category.upper()}_{replacement_counters[category]}]"


# ============================================================
# REDACTION FUNCTION
# ============================================================

def redact_text(text):
    """
    Replace detected PII in a piece of text.

    Order:
    email -> phone -> IP -> SSN -> DOB
    """

    if not text:
        return text

    # --------------------------------------------------------
    # EMAIL
    # --------------------------------------------------------

    def replace_email(match):
        return get_replacement("email")

    text = EMAIL_PATTERN.sub(replace_email, text)


    # --------------------------------------------------------
    # PHONE
    # --------------------------------------------------------

    def replace_phone(match):
        return get_replacement("phone")

    text = PHONE_PATTERN.sub(replace_phone, text)


    # --------------------------------------------------------
    # IP ADDRESS
    # --------------------------------------------------------

    def replace_ip(match):
        return get_replacement("ip")

    text = IP_PATTERN.sub(replace_ip, text)


    # --------------------------------------------------------
    # SSN
    # --------------------------------------------------------

    def replace_ssn(match):
        return get_replacement("ssn")

    text = SSN_PATTERN.sub(replace_ssn, text)


    # --------------------------------------------------------
    # DATE OF BIRTH
    # --------------------------------------------------------

    def replace_dob(match):
        full_match = match.group(0)
        original_date = match.group(1)

        replacement = get_replacement("dob")

        return full_match.replace(original_date, replacement)

    text = DOB_PATTERN.sub(replace_dob, text)


    return text


# ============================================================
# PROCESS PARAGRAPH
# ============================================================

def process_paragraph(paragraph):

    original_text = paragraph.text

    if not original_text:
        return

    redacted_text = redact_text(original_text)

    if redacted_text != original_text:
        paragraph.text = redacted_text


# ============================================================
# PROCESS TABLE
# ============================================================

def process_table(table):

    for row in table.rows:

        for cell in row.cells:

            # Normal paragraphs inside the cell
            for paragraph in cell.paragraphs:
                process_paragraph(paragraph)

            # Nested tables
            for nested_table in cell.tables:
                process_table(nested_table)


# ============================================================
# PROCESS HEADERS AND FOOTERS
# ============================================================

def process_headers_and_footers(document):

    for section in document.sections:

        # Header
        header = section.header

        for paragraph in header.paragraphs:
            process_paragraph(paragraph)

        for table in header.tables:
            process_table(table)

        # Footer
        footer = section.footer

        for paragraph in footer.paragraphs:
            process_paragraph(paragraph)

        for table in footer.tables:
            process_table(table)


# ============================================================
# PROCESS DOCUMENT
# ============================================================

def redact_document(input_file, output_file):

    print("Reading document...")

    document = Document(input_file)


    print("Redacting paragraphs...")

    for paragraph in document.paragraphs:
        process_paragraph(paragraph)


    print("Redacting tables...")

    for table in document.tables:
        process_table(table)


    print("Redacting headers and footers...")

    process_headers_and_footers(document)


    # Create output directory
    output_file.parent.mkdir(
        parents=True,
        exist_ok=True
    )


    print("Saving redacted document...")

    document.save(output_file)


    print()
    print("=" * 60)
    print("REDACTION COMPLETED")
    print("=" * 60)
    print(f"Input :  {input_file}")
    print(f"Output:  {output_file}")
    print("=" * 60)


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    if not INPUT_FILE.exists():

        print("ERROR: Input document was not found.")
        print(INPUT_FILE)

        raise SystemExit(1)


    redact_document(
        INPUT_FILE,
        OUTPUT_FILE
    )