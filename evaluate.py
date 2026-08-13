from src.redactor import redact_text


# ============================================================
# EVALUATION DATASET
# ============================================================
# 1 = PII
# 0 = NOT PII
#
# This is a small manually annotated test set.
# In the final README, we will clearly explain that this
# evaluation set is representative and manually labeled.

TEST_DATA = [
    # Names
    ("Sarthak Malvadkar", 1),
    ("Kushal Subbayya Hegde", 1),

    # Email
    ("test@example.com", 1),
    ("cs.connect@kshinternational.com", 1),

    # Phone
    ("+91 9876543210", 1),
    ("Telephone: +91 20 45053237", 1),

    # Address
    ("11/3 Village Birdewadi Pune", 1),

    # SSN
    ("123-45-6789", 1),

    # Credit card
    ("4111 1111 1111 1111", 1),

    # Date of birth
    ("Date of Birth: 15/08/2000", 1),

    # IP address
    ("192.168.1.100", 1),

    # Company
    ("KSH INTERNATIONAL LIMITED", 1),
    ("Nuvama Wealth Management Limited", 1),

    # --------------------------------------------------------
    # NON-PII examples
    # --------------------------------------------------------

    ("The company reported strong financial performance.", 0),
    ("Equity Shares", 0),
    ("INR 4,200 million", 0),
    ("Prospectus Issue Date: December 10, 2025", 0),
    ("SEBI ICDR Regulations", 0),
    ("Book Running Lead Managers", 0),
    ("Financial Express", 0),
]


# ============================================================
# DETERMINE WHETHER REDACTION OCCURRED
# ============================================================

def was_redacted(original_text, redacted_text):
    """
    Returns True if the redaction engine changed the text.
    """

    return original_text != redacted_text


# ============================================================
# METRICS
# ============================================================

def calculate_metrics(results):

    true_positive = 0
    true_negative = 0
    false_positive = 0
    false_negative = 0

    for actual, predicted in results:

        if actual == 1 and predicted == 1:
            true_positive += 1

        elif actual == 0 and predicted == 0:
            true_negative += 1

        elif actual == 0 and predicted == 1:
            false_positive += 1

        elif actual == 1 and predicted == 0:
            false_negative += 1

    total = len(results)

    accuracy = (
        (true_positive + true_negative) / total
        if total > 0 else 0
    )

    precision = (
        true_positive / (true_positive + false_positive)
        if (true_positive + false_positive) > 0 else 0
    )

    recall = (
        true_positive / (true_positive + false_negative)
        if (true_positive + false_negative) > 0 else 0
    )

    return (
        accuracy,
        precision,
        recall,
        true_positive,
        true_negative,
        false_positive,
        false_negative
    )


# ============================================================
# RUN EVALUATION
# ============================================================

def main():

    results = []

    print()
    print("=" * 70)
    print("PII REDACTION EVALUATION")
    print("=" * 70)

    for text, actual in TEST_DATA:

        redacted = redact_text(text)

        predicted = 1 if was_redacted(text, redacted) else 0

        results.append((actual, predicted))

        print()
        print("Input    :", text)
        print("Output   :", redacted)
        print("Expected :", "PII" if actual else "NON-PII")
        print("Detected :", "PII" if predicted else "NON-PII")

    (
        accuracy,
        precision,
        recall,
        tp,
        tn,
        fp,
        fn
    ) = calculate_metrics(results)

    print()
    print("=" * 70)
    print("EVALUATION RESULTS")
    print("=" * 70)

    print(f"Total samples : {len(results)}")
    print(f"True Positives: {tp}")
    print(f"True Negatives: {tn}")
    print(f"False Positives: {fp}")
    print(f"False Negatives: {fn}")

    print()
    print(f"Accuracy : {accuracy * 100:.2f}%")
    print(f"Precision: {precision * 100:.2f}%")
    print(f"Recall   : {recall * 100:.2f}%")

    print("=" * 70)


if __name__ == "__main__":
    main()