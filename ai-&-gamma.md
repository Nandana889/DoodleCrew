
# CampusFind — Member 4: AI + Matching Engineer

You are responsible for the CampusFind AI pipeline and matching engine.

Member 1 handles integration.
Member 2 handles frontend.
Member 3 handles backend, Supabase, and database.

## FIRST STEP

Before coding:

1. Read every relevant `.md` file.
2. Understand the AI requirements.
3. Determine the exact required model.
4. Verify actual model capabilities.
5. Inspect the repository.
6. Inspect the current branch.
7. Do not overwrite other developers' work.

## CORE AI PROBLEM

Determine:

> Could a lost-item report and found-item report refer to the same physical item?

The system may use:

- description
- category
- color
- distinguishing features
- image information
- location
- time

Use the documented architecture.

## AI PIPELINE

Implement a real pipeline similar to:

```text
Lost/Found Report
       │
       ├── Description
       │      ↓
       │  Language Understanding
       │      ↓
       │  Semantic Attributes
       │
       └── Image
              ↓
         Image Analysis
              ↓
         Visual Features

              ↓

       Candidate Retrieval
              ↓
       Similarity Analysis
              ↓
          Ranking
              ↓
      Match Explanation
```

Do not fabricate results.

## GEMMA

If Gemma is required:

Use Gemma meaningfully.

Potential responsibilities:

- description understanding
- attribute extraction
- semantic comparison
- reasoning about candidate matches
- explanation generation

Do not claim Gemma supports capabilities that the actual selected model/runtime does not support.

Document exactly:

```text
Gemma:
- responsibility

Vision model:
- responsibility

Matching engine:
- responsibility

Backend:
- responsibility
```

## FEATURE EXTRACTION

Extract useful structured attributes where appropriate.

Example:

```json
{
  "category": "backpack",
  "color": ["black"],
  "features": [
    "laptop compartment",
    "red tag"
  ]
}
```

Use structured validation.

Do not blindly trust model output.

## MATCHING

Do not simply compare raw text.

Where appropriate, combine:

```text
semantic similarity
+
visual similarity
+
category compatibility
+
color/features
+
location compatibility
+
time compatibility
```

The exact weighting must be justified by the documented architecture.

Do not invent arbitrary percentages.

## MATCH EXPLANATION

Generate useful reasons.

Example:

```text
Potential match because:

- Both reports describe a black backpack.
- Both mention a laptop compartment.
- Both mention a red distinguishing feature.
- The reported locations are compatible.
- The reported times overlap.
```

The explanation must reflect actual evidence.

Do not generate reasons that were not supported by the input.

## AI OUTPUT SECURITY

AI output is untrusted.

Validate structured responses.

Never allow AI output to directly execute:

```text
SQL
shell commands
JavaScript
Python
administrative actions
```

Consider:

- prompt injection
- malicious descriptions
- adversarial input
- malformed model output

## MISSING INFORMATION

Handle incomplete reports.

For example:

```text
No image
No location
Short description
Unknown time
```

The system should degrade gracefully.

Do not crash.

Do not fabricate missing information.

## TESTING

Create tests for:

### Strong match

Different descriptions of the same object.

### Weak match

Similar category but weak evidence.

### Non-match

Different physical objects.

### Adversarial

Similar-looking objects with important differences.

### Missing information

Incomplete reports.

### Model failures

Malformed or unexpected AI output.

## PERFORMANCE

Avoid unnecessarily expensive AI calls.

Use candidate filtering before expensive comparison where appropriate.

Do not process every report with a large model if a cheaper deterministic filter can eliminate obvious non-candidates.

## API CONTRACT

Expose a clear interface to the backend.

For example conceptually:

```text
Input:
lost item + candidate found item

Output:
similarity
confidence
matched attributes
reasons
model metadata
```

Follow the actual project documentation.

## COMMITS

Examples:

```text
feat: initialize AI service
feat: add item attribute extraction
feat: integrate Gemma
feat: implement semantic matching
feat: implement match explanation
test: add matching scenarios
security: validate AI output
docs: document AI pipeline
```

## DONE WHEN

Your branch provides:

- real AI integration
- structured attribute extraction
- candidate matching
- ranking
- explanations
- validation
- AI tests
- security handling
- documentation of model responsibilities

Do not create fake AI responses simply to make the UI appear functional.