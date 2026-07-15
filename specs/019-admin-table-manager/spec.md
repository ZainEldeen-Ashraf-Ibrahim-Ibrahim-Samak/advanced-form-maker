# Feature Specification: Admin Table Manager

**Feature Branch**: `019-admin-table-manager`
**Created**: 2026-07-15
**Status**: Draft
**Input**: User description: "add foeate callded table that now can ddedd tbale and admin can mange the rows headers of table and make ofption and can add comln header of table although"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add Table Field to Form (Priority: P1)

As a form administrator, I want to add a Table field to my form so that I can collect structured, tabular data from users.

**Why this priority**: The core requirement is the ability to place the table field in a form, which must exist before configuring its properties.

**Independent Test**: Can be tested by dragging/adding a Table field into the form builder and verifying it appears in the form preview.

**Acceptance Scenarios**:

1. **Given** the admin is in the form builder, **When** they add a "Table" component, **Then** a new table field is added to the form structure.
2. **Given** a table field is in the form, **When** the admin views the form preview, **Then** the table is rendered for the end user to fill out.

---

### User Story 2 - Configure Column Headers (Priority: P1)

As a form administrator, I want to manage the column headers of the table so that I can define the data attributes I need to collect.

**Why this priority**: Columns define the structure of the data the table will collect, making it essential for the table's usefulness.

**Independent Test**: Can be tested by adding, editing, and deleting column headers in the table field's configuration panel and seeing the changes reflect on the table.

**Acceptance Scenarios**:

1. **Given** a table field is selected in the form builder, **When** the admin adds a new column header, **Then** the table updates to show the new column.
2. **Given** existing column headers, **When** the admin edits or removes a column, **Then** the table structure is updated accordingly.

---

### User Story 3 - Configure Row Headers / Pre-defined Rows (Priority: P2)

As a form administrator, I want to manage the row headers of the table so that I can pre-define the items users need to provide data for.

**Why this priority**: While users might be able to add their own rows, pre-defining rows (row headers) is specifically requested for specific structured data collection (e.g., grading specific criteria).

**Independent Test**: Can be tested by adding pre-defined rows in the table configuration and verifying they appear as fixed row labels in the form.

**Acceptance Scenarios**:

1. **Given** a table field is selected in the form builder, **When** the admin adds a new row header, **Then** a new row with that header is added to the table template.
2. **Given** pre-defined row headers, **When** an end-user views the form, **Then** they see those rows and can enter data into the corresponding columns.

---

### User Story 4 - Manage Table Options (Priority: P3)

As a form administrator, I want to configure options for the table (like whether users can add their own rows) so that I can control how the table is used.

**Why this priority**: Additional configuration options enhance the component but are secondary to defining its basic structure.

**Independent Test**: Can be tested by toggling table options (e.g., "Allow user to add rows") and verifying the behavior changes in the form.

**Acceptance Scenarios**:

1. **Given** a table field is selected, **When** the admin toggles "Allow user to add rows", **Then** the form preview shows or hides the "Add Row" button for end-users.

### Edge Cases

- What happens when a table has zero columns or zero row headers? (Should require at least one column).
- How does the system handle very large tables with many columns on mobile devices?
- What happens if the admin changes column headers after some users have already submitted data?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a "Table" field type in the form builder toolbox.
- **FR-002**: System MUST allow admins to add, edit, and delete column headers for a Table field.
- **FR-003**: System MUST allow admins to add, edit, and delete row headers (pre-defined rows) for a Table field.
- **FR-004**: System MUST render the configured table in the form preview and the live form.
- **FR-005**: System MUST collect and store user input entered into the table cells during form submission.
- **FR-006**: System MUST provide an option for admins to allow or disallow end-users from adding their own rows.

### Key Entities

- **TableField**: Represents the table component in the form schema, containing configuration for columns, row headers, and options.
- **TableColumn**: Represents a column definition, including its label and potentially data type (e.g., text, number).
- **TableRowHeader**: Represents a pre-defined row label.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins can successfully add and configure a table with both row and column headers in under 2 minutes.
- **SC-002**: Form respondents can successfully input data into the table on both desktop and mobile views without layout breakage.
- **SC-003**: Table data is correctly saved and displayed in the form submissions view.

## Assumptions

- We assume the table cells will primarily accept text or numeric input by default. More complex cell types (like dropdowns inside cells) might be out of scope for the initial version unless requested.
- We assume standard responsive design practices (like horizontal scrolling) will be used for tables on mobile devices.
