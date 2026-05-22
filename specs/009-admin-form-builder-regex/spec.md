# Feature Specification: admin-form-builder-regex

**Feature Branch**: `009-admin-form-builder-regex`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: User description: "now make regixes for input on forms and conact for users sumbtion to avoid although any issues , iwant although for admin when entring the forms names , and placholders although the when admin create the from name , and discrptions"

## Clarifications

### Session 2026-04-14
- Q: Regex Strictness for Descriptions vs Names? → A: Use the same strict regex for both Names and Descriptions (Option A).
- Q: End-user submission validation strategy? → A: Validate strictly by field type (email, number) and sanitize text fields to prevent XSS.
- Q: Admin text fields whitelist? → A: Allow basic punctuation (., -, _, ?, !, &, (), ', ") alongside alphanumeric text and spaces.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Form Name and Description Entry (Priority: P1)

Admins must be restricted to safe, recognized characters when naming a form or writing a form description to prevent injection attacks and UI display issues.

**Why this priority**: Form metadata is highly visible to end-users and is used in URLs and database queries. Enforcing strict character rules prevents broken layouts and data corruption.

**Independent Test**: Attempt to create a form named `<script>Hack</script>` or using obscure emojis. The system should block the submission and display a real-time validation error.

**Acceptance Scenarios**:

1. **Given** an admin is creating or editing a form, **When** they type unsupported special characters into the Form Name or Form Description fields, **Then** a validation error message appears and the save button is disabled.
2. **Given** an admin is creating or editing a form, **When** they type standard alphanumeric characters (including Arabic) into the Form Name, **Then** the form is saved successfully.

---

### User Story 2 - Secure Form Builder Field Labels and Placeholders (Priority: P1)

Admins must be restricted to safe characters when defining custom fields (e.g., Input Names, Input Placeholders, Contact Form input names) within the form builder interface.

**Why this priority**: Input labels and placeholders are directly rendered to clients. Validating them prevents layout breaking and XSS vulnerabilities on the client submission view.

**Independent Test**: Attempt to add a new custom field with the name `Name /* */` or a placeholder like `'; DROP TABLE`. The field save operation should be blocked, showing a validation error.

**Acceptance Scenarios**:

1. **Given** an admin is defining a custom field in the form builder, **When** they enter unsupported characters into the Field Name or Placeholder (English/Arabic), **Then** a clear validation error is shown and the change is not accepted.
2. **Given** an admin is configuring a Contact Form input inside the field builder, **When** they use safe alphanumeric text, **Then** the configuration is saved successfully.

---

### User Story 3 - Secure End-User Form Submissions (Priority: P1)

End-users submitting responses to client-facing forms must have their input validated structurally (e.g., valid email formats) and sanitized against malicious scripts.

**Why this priority**: While admin interfaces prevent malicious forms from being created, the end-user submissions are the primary vector for capturing data. Unsanitized data can lead to stored XSS when viewed by admins.

**Independent Test**: Attempt to submit a form where a text input contains `<script>alert(1)</script>` and an email field contains `invalid-email`. The system should reject the email format and sanitize the text field.

**Acceptance Scenarios**:

1. **Given** a user is filling out a form, **When** they enter malformed data into typed fields (like email or number), **Then** they receive a specific format validation error.
2. **Given** a user submits a form, **When** text fields contain potential script tags, **Then** the system sanitizes the input before saving to the database.

### Edge Cases

- What happens when an admin pastes text that contains hidden non-printable characters (e.g., zero-width spaces)? The system should strip or reject them.
- How does the system handle extremely long label strings with valid characters but exceeding DB limits? The frontend validation should restrict maximum length alongside regex formatting.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST strictly validate the Form Name and Form Description against the *exact same* predefined safe-character whitelist: English/Arabic alphanumeric letters, spaces, and standard basic punctuation (`.`, `,`, `-`, `_`, `?`, `!`, `&`, `(`, `)`, `'`, `"`).
- **FR-002**: System MUST validate all custom field labels (English and Arabic) and placeholders against the safe-character whitelist inside the dynamic form builder.
- **FR-003**: System MUST validate the Contact Form internal field names and placeholders against the safe-character whitelist.
- **FR-004**: System MUST present real-time visual feedback (e.g., inline error messages) when an admin types invalid characters into any of the text fields mentioned above.
- **FR-005**: System MUST block the final submission or save action if any field contains invalid characters.
- **FR-006**: System MUST validate end-user submissions rigorously according to their specified field type (e.g., standard Regex for Emails and Phone Numbers).
- **FR-007**: System MUST sanitize all free-text end-user form submissions to strip potentially dangerous HTML/script tags before storing the data.

### Key Entities *(include if feature involves data)*

- **Form Template**: Contains metadata (name, description) and a structure of fields.
- **Field Definition**: Contains display attributes like name (locale-specific) and placeholders.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly created forms and fields reject unsupported special characters.
- **SC-002**: Validation feedback is strictly visible to the admin in under 100ms.
- **SC-003**: Zero cases of script injection or broken layouts caused by malicious form definitions.

## Assumptions

- We assume basic punctuation (e.g., commas, periods, hyphens, question marks) is allowed in descriptions but explicitly unsafe characters (e.g., angle brackets) will be stripped or blocked.
- We assume the existing UI library (e.g., standard input fields) can easily accommodate inline validation messages without major layout shifts.
