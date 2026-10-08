
# CampusFind — Member 2: Frontend Engineer

You are responsible for the CampusFind frontend.

Member 1 handles integration.
Member 3 handles backend/Supabase.
Member 4 handles AI/matching.

Do not implement their responsibilities unless required for a small integration contract.

## FIRST STEP

Read all relevant `.md` files before coding.

Then inspect:

- existing frontend
- package.json
- current branch
- Git status
- existing shared types
- documented API requirements

Do not overwrite existing work.

## FRONTEND STACK

Use the documented stack.

Default:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Framer Motion
- React Router
- React Hook Form
- Zod

Do not add unnecessary dependencies.

## RESPONSIBILITY

Build the complete frontend experience.

### Pages

Implement the pages required by documentation.

Expected CampusFind areas include:

```text
Login
Register
Dashboard
Report Lost
Report Found
My Reports
Matches
Match Details
Verification
Profile
```

Only implement pages required by the actual documentation.

## COMPONENTS

Create reusable components such as:

```text
Navbar
Sidebar
ItemCard
ReportForm
ImageUpload
MatchCard
MatchScore
StatusBadge
LoadingState
EmptyState
ErrorState
ConfirmationDialog
```

Do not create duplicate components.

## REPORT FLOW

Build UI for:

```text
Report Lost
      ↓
Image
      ↓
Description
      ↓
Category
      ↓
Location
      ↓
Approximate time
      ↓
Submit
```

And:

```text
Report Found
      ↓
Image
      ↓
Description
      ↓
Category
      ↓
Location
      ↓
Approximate time
      ↓
Submit
```

Use proper validation.

## MATCH UX

Create a clear potential match experience.

Example:

```text
Potential Match

Similarity: 91%

Why this may be a match:

✓ Similar category
✓ Similar color
✓ Similar distinguishing features
✓ Compatible location
✓ Compatible time

[View Details]
[Start Verification]
```

Do not invent or hard-code scores.

The frontend should display the score supplied by the real matching system.

## VERIFICATION

Build the ownership verification interface.

Important:

A high AI score does NOT mean automatic ownership.

The interface must make this distinction clear.

## UX

The application must be:

- responsive
- accessible
- clean
- consistent
- student-friendly

Use shadcn/ui consistently.

Use Framer Motion for purposeful:

- transitions
- loading states
- match appearance
- success states
- feedback

Do not over-animate.

## API

Consume backend APIs through a clean service layer.

Do not place API calls randomly throughout components.

Use something like:

```text
src/services/
```

for API communication.

Handle:

- loading
- success
- failure
- unauthorized
- empty states

## SECURITY

Never:

- expose secrets
- put service-role keys in frontend code
- trust frontend authorization
- expose private data unnecessarily

Treat API responses as untrusted.

## TESTING

Test:

- forms
- validation
- navigation
- loading states
- errors
- authentication states
- report creation
- match display
- verification flow
- responsive layouts

Run:

```text
lint
typecheck
build
tests
```

## COMMITS

Examples:

```text
feat: create dashboard layout
feat: add lost item report form
feat: add found item report form
feat: implement image upload UI
feat: add match result interface
feat: add ownership verification UI
fix: improve report validation
test: add report form tests
```

## DONE WHEN

Your frontend branch provides the complete UI required by the documentation and exposes clean interfaces for the backend and AI functionality.

Do not fake backend responses permanently.

Use temporary mocks only when explicitly needed for isolated UI development, and remove/replace them before the branch is considered complete.