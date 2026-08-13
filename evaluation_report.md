# PII Redaction Tool - Evaluation Report

## 1. Objective

The purpose of this evaluation is to measure how effectively the PII Redaction Tool detects and redacts personally identifiable information while avoiding unnecessary redaction of non-PII content.

The evaluation measures:

- Accuracy
- Precision
- Recall

The evaluation was performed using a manually annotated test dataset containing representative PII and non-PII examples.

---

## 2. Evaluation Methodology

The redaction system uses a hybrid detection approach:

1. Regular expressions are used for structured PII such as:
   - Email addresses
   - Phone numbers
   - IP addresses
   - Social Security Numbers (SSNs)
   - Credit card numbers
   - Dates of birth
   - Physical addresses

2. spaCy Named Entity Recognition (NER) is used for:
   - Person names
   - Company/organization names

3. The detected PII is replaced with deterministic redaction tokens such as:

```text
[REDACTED_NAME_1]
[REDACTED_EMAIL_1]
[REDACTED_PHONE_1]
[REDACTED_ADDRESS_1]
[REDACTED_SSN_1]
[REDACTED_CARD_1]
[REDACTED_DOB_1]
[REDACTED_IP_1]
[REDACTED_COMPANY_1]