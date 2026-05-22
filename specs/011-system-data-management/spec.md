# Feature Specification: System Data Management

**Feature Branch**: `[011-system-data-management]`  
**Created**: 2026-04-15  
**Status**: Draft  
**Input**: User description: "make if there is drafts auto delte after time with days and add to seetings model and seetings page althouhg fix the backup systtem to be enured backed all models is the system although make reostre functuin and add to seetings page the export ssytem not accpet trnation keys na d not  read all valuse in the table"

## Clarifications

### Session 2026-04-15
- Q: When the storage threshold is hit, what is the expected behavior for deleting data? → A: Delete only the Cloudinary media files for the target, leaving the database records intact (though media links will break).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configurable Draft Auto-Deletion (Priority: P1)

An administrator wants to configure the system to automatically delete old drafts after a specified number of days via the settings page to manage storage and keep data clean.

**Why this priority**: Helps maintain system performance and storage capacity by cleaning up stale data automatically.

**Independent Test**: Can be tested by setting a retention period in the settings page, creating a draft, advancing the system time (or waiting), and verifying the draft is automatically removed while the setting persists correctly.

**Acceptance Scenarios**:

1. **Given** an admin is on the Settings page, **When** they update the "Draft Auto-Delete Days" setting and save, **Then** the new value is stored in the settings model.
2. **Given** the system has drafts older than the configured auto-delete threshold, **When** the scheduled cleanup process runs, **Then** those old drafts are permanently deleted.
3. **Given** a draft is newer than the configured threshold, **When** the cleanup process runs, **Then** the draft is retained.

---

### User Story 2 - Comprehensive System Backup and Restore (Priority: P1)

An administrator needs to back up all system models reliably and be able to restore the system from a previous backup directly from the Settings page.

**Why this priority**: Data integrity and disaster recovery are critical for any production system. The current backup system is missing models and lacks a restore UI.

**Independent Test**: Can be tested by creating data across all models, generating a backup, modifying/deleting data, and using the restore function on the Settings page to successfully return the system to the exact backed-up state.

**Acceptance Scenarios**:

1. **Given** an admin triggers a system backup, **When** the backup completes, **Then** the backup artifact contains data from every registered model in the system without omissions.
2. **Given** an admin is on the Settings page, **When** they select a valid backup artifact to restore, **Then** the system applies the backup and restores all models to their prior state.
3. **Given** an admin attempts to restore an invalid or corrupted backup, **When** the restore process begins, **Then** the system rejects the file and displays an error message without corrupting current data.

---

### User Story 3 - Reliable Data Export (Priority: P2)

An administrator wants to export system data, ensuring that the export process correctly handles transaction keys and includes all values present in the database tables.

**Why this priority**: The current export system is failing on transaction keys and dropping values, which breaks data portability and reporting.

**Independent Test**: Can be tested by generating an export for a table containing transaction keys and various data types, then verifying the output file contains all expected columns and rows without errors.

**Acceptance Scenarios**:

1. **Given** an admin initiates a data export for a table with transaction keys, **When** the export processes, **Then** it accepts and correctly formats the transaction keys without crashing.
2. **Given** a table with populated data across all columns, **When** the export is generated, **Then** every value from the table is successfully read and included in the final export artifact.

### User Story 4 - Cloudinary Storage Analytics and Auto-Cleanup (Priority: P2)

An administrator wants to view Cloudinary media storage usage on the dashboard and configure a storage threshold in settings so that specific data can be automatically emptied when the limit is reached.

**Why this priority**: Helps manage external media hosting costs and prevents system failures due to running out of cloud storage capacity.

**Independent Test**: Can be tested by viewing the dashboard analytics widget for accurate Cloudinary usage, setting a storage threshold in the Settings page, and verifying that the selected "target to empty" is cleaned up when usage exceeds the limit.

**Acceptance Scenarios**:

1. **Given** an admin views the dashboard, **When** the analytics section loads, **Then** a widget displays the current Cloudinary media storage usage (e.g., in MB/GB or percentage).
2. **Given** an admin is on the Settings page, **When** they configure a "Storage Limit Threshold" and a "Target to Empty" (e.g., old drafts, unused media) and save, **Then** the settings are stored correctly.
3. **Given** the Cloudinary storage usage exceeds the configured threshold, **When** the system runs its scheduled checks, **Then** the configured target data is automatically deleted to free up space.

### Edge Cases

- Admin sets the draft auto-delete days to 0 or a negative number.
- A restore is attempted while other users are actively modifying data in the system.
- The backup file is too large for standard upload limits on the Settings page.
- Exporting extremely large tables causes memory or timeout issues.
- The Cloudinary API is temporarily down, preventing the dashboard from fetching the storage usage.
- The storage auto-cleanup triggers, but emptying the selected target does not free up enough space to fall below the threshold.
- The storage auto-cleanup triggers and deletes media files, leaving the associated database records intact but containing broken media links.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a configuration option in the Settings model and Settings UI to define the number of days before a draft is automatically deleted.
- **FR-002**: System MUST automatically identify and delete draft records that have exceeded the configured retention period.
- **FR-003**: System MUST include data from all defined data models when generating a system backup.
- **FR-004**: System MUST provide a "Restore" function accessible via the Settings page UI.
- **FR-005**: System MUST be able to process a backup artifact and overwrite current system data with the backed-up data across all models.
- **FR-006**: System MUST ensure the data export functionality can process and include transaction keys without errors.
- **FR-007**: System MUST read and include all column values for a given table during the export process, preventing silent data omission.
- **FR-008**: System MUST disable the draft auto-deletion process entirely if the configured retention period is set to 0 or left blank.
- **FR-009**: System MUST display an analytics widget on the dashboard indicating the amount of media storage currently used in Cloudinary.
- **FR-010**: System MUST provide a configuration option in the Settings model and Settings UI to define a maximum storage threshold.
- **FR-011**: System MUST provide a setting to specify which target entity (e.g., drafts, unused media) should have its media automatically emptied when the storage threshold is reached; this action MUST delete only the Cloudinary media files, leaving the associated database records intact.

### Key Entities *(include if feature involves data)*

- **Settings**: System configuration model, updated to include `draft_retention_days`, `cloudinary_storage_threshold`, and `storage_cleanup_target`.
- **Backup**: An artifact containing a serialized snapshot of all system models.
- **Export**: An artifact representing data extracted from system tables, including transaction keys.
- **Draft**: A generic representation of any draft record subject to time-based retention rules.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of drafts older than the configured threshold are deleted during the automated cleanup cycle.
- **SC-002**: Generated backups contain data payloads for 100% of the active database models.
- **SC-003**: System restoration successfully returns all models to their backed-up state without data corruption.
- **SC-004**: Exports complete successfully 100% of the time when tables contain transaction keys, with 0 missing column values.
- **SC-005**: UI actions on the Settings page (updating draft days, triggering restore) respond within 2 seconds under normal conditions.
- **SC-006**: The Cloudinary dashboard widget correctly reflects storage data fetched from the external API with less than 5 seconds of loading latency.
- **SC-007**: Targeted data is successfully purged by automated processes if the external media storage threshold is reached.

## Assumptions

- "Drafts" refers to a unified concept of draft states across the system.
- The backup and restore process requires administrative privileges.
- Backups and exports are generated in a standard, project-defined format.
- The system already has a scheduled task/cron mechanism that can be leveraged for the daily draft cleanup job.
- Restoring a backup is a destructive action that overwrites current system data.
- The application has valid Cloudinary API credentials accessible to fetch storage metrics securely.