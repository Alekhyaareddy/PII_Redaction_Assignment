# PII Redaction Tool — Evaluation Report

## 1. Evaluation objective

This evaluation measures whether the active redaction engine, `src/redactor.py`, changes manually labelled PII samples while leaving manually labelled non-PII samples unchanged. It reports accuracy, precision, recall, and F1 without claiming complete recall on the full prospectus.

## 2. PII categories evaluated

The controlled dataset includes full names, email addresses, Indian phone numbers, physical/mailing addresses, SSNs, credit-card numbers, labelled dates of birth, IPv4 addresses, and company names. The active engine uses regex and deterministic rules for structured PII, a conservative address heuristic, known-name/company matching, suffix-based company matching, and spaCy `PERSON` NER for additional multiword names.

## 3. Dataset and methodology

`evaluate.py` contains 20 manually labelled text samples: 13 PII samples and 7 non-PII samples. A sample is counted as detected when `redact_text()` changes it. Results are therefore text-sample classification results, not entity-span measurements and not a ground-truth annotation of the full Red Herring Prospectus.

The evaluation cases and labels were not changed for this release. A conservative fallback was added for number-led, city-qualified address lines without a PIN code; it is general pattern matching, not a special case for an evaluation string.

## 4. Measured results

Running `python evaluate.py` produced:

| Measure | Result |
|---|---:|
| Dataset size | 20 |
| True positives (TP) | 13 |
| True negatives (TN) | 7 |
| False positives (FP) | 0 |
| False negatives (FN) | 0 |
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 score | 100.00% |

Accuracy is `(TP + TN) / 20`; precision is `TP / (TP + FP)`; recall is `TP / (TP + FN)`; and F1 is the harmonic mean of precision and recall. No redaction rate is reported because the prospectus has not been exhaustively ground-truth annotated.

## 5. Category-level findings

All 13 positive controlled samples were redacted: two names, two emails, two phones, one address, one SSN, one card, one labelled DOB, one IPv4 address, and two company names. All seven non-PII controls remained unchanged. This supports correct behavior for the included formats only; it does not prove 100% recall for each category in arbitrary documents.

## 6. False-positive and false-negative analysis

The controlled test produced no false positives or false negatives. The prior address false negative, `11/3 Village Birdewadi Pune`, is now detected by the number-led, city-qualified address fallback.

Important remaining limitations apply outside the small dataset. Address detection without a PIN remains deliberately conservative: it requires a number-led address, an address word, and a supported city. Addresses in other layouts can be missed. Company suffix rules and NER may produce false positives or miss organizations without known names or supported suffixes. Phone detection is tuned for common Indian formats; IPv6 and unlabelled dates are outside the tested coverage. The model should therefore be reviewed for high-stakes use.

## 7. Real prospectus verification

The pipeline was run on `input/Red Herring Prospectus.docx` and produced `output/redacted_prospectus.docx` successfully.

| Check | Result |
|---|---|
| Output DOCX valid and readable by `python-docx` | Pass |
| Output size | 1,844,972 bytes |
| Paragraphs / tables / sections retained | 1,006 / 76 / 85 |
| Redactions: names / emails / phones / companies / addresses | 255 / 52 / 36 / 138 / 45 |
| Redactions: SSNs / cards / DOBs / IPs | 0 / 0 / 0 / 0 |
| Detectable email, phone, SSN, card, labelled DOB, or IPv4 remaining | 0 each |
| Configured known names or companies remaining | 0 |

The zero structured-category counts reflect the detectable content of this prospectus, not proof that those PII categories have universal 100% recall.

## 8. Reproducibility

From the repository root, install dependencies and the spaCy model, then run:

```bash
python -m pip install -r requirements.txt
python -m spacy download en_core_web_sm
python evaluate.py
python -m src.redactor
python src/verify_redaction.py
```

`verify_redaction.py` checks email, phone, IP, and SSN patterns. The broader prospectus checks in this report were also performed against the active redactor patterns and configured known-name/company lists.

## 9. Conclusion

The controlled evaluation currently scores 100.00% across the 20 fixed labelled samples. This is reproducible but small-scale evidence. The real prospectus pipeline completes, produces a valid redacted DOCX, and removes all remaining instances detectable by the active verification patterns. The documented limitations should be considered when applying the tool to unseen documents.
