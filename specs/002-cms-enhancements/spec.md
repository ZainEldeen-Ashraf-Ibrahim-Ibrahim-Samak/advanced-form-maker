# Feature Specification: CMS Enhancements & Robust Tools

**Feature Branch**: `[002-cms-enhancements]`
**Created**: 2026-04-13
**Status**: Draft
**Input**: "make env handeler and use it inside every file istead of har coded process . env , make the ar folder is oject from en to if added in en must added to ar wothout errros nd make scripts one to chect if theres is trnation keys not added to ar , en arros all files and second one is to check if there is any unknwon words or lagngues then i if user refreash the input that filled restore for ux of users , make in dasboards seetings system , and analnysis system , and although in seetings add system fro cron daily , hoursy monthly but must one work of them but not all as once in cron add backup system that bakcuo with there options is local , both , cloud the db system and make media manger that have all media that added in the web site and easy to handel them , although make every thing works of any summbtion of user works as with socet system and nofications for admin"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Experience & Robustness (Priority: P1)

Developers require centralized, validated configuration management instead of hard-coded environment variables, and automated translation syncing scripts. This prevents runtime crashes, ensures Arabic translations always safely mirror English structure without breaking the app, and provides linting to detect missing or orphaned keys.

**Why this priority**: Stabilizes the app's foundational architecture and developer experience before further complexity is built, reducing production bugs related to configuration or missing Arabic keys.

**Independent Test**: Can be tested by running the translation sync script and attempting to access an invalid configuration property.

**Acceptance Scenarios**:

1. **Given** a new environment variable requirement, **When** the developer adds it to configuration, **Then** the system validates it upon startup and enforces strict typing across all files.
2. **Given** a new English translation string, **When** the developer runs the sync script, **Then** the Arabic translation file automatically creates a placeholder key preventing crashes.

---

### User Story 2 - Form Auto-Save Recovery for Clients (Priority: P2)

Clients filling out vast dynamic forms must not lose their inputted text and configurations if they accidentally refresh their browser. Drafts should seamlessly recover.

**Why this priority**: Crucial UX enhancement that substantially improves the user submission completion rate and overall satisfaction.

**Independent Test**: Can be fully tested by filling half a form, refreshing the web page, and observing the form state recovering immediately.

**Acceptance Scenarios**:

1. **Given** an incomplete form submission, **When** the client reloads the page, **Then** the previously typed values remain populated in their designated fields.
2. **Given** a successfully submitted form, **When** the submitted form's page is revisited, **Then** the draft cache is cleared.

---

### User Story 3 - Admin Settings, Cron, and Backups (Priority: P1)

Admins require a cohesive "Settings" Dashboard where they can manage system-wide parameters. Specifically, they need to configure automated chronological tasks (cron) to run at restricted intervals (either minutely, hourly, daily, or monthly, but never simultaneously). Among these tasks is a Database Backup system where admins can choose between Local, Cloud, or Both.

**Why this priority**: Database safety is paramount for a CMS. The ability to guarantee automated backups protects business continuity.

**Independent Test**: Can be tested by selecting an "Hourly" backup to "Local" destination, verifying the configuration saves, and observing that Daily/Monthly are disabled.

**Acceptance Scenarios**:

1. **Given** the Admin Settings dashboard, **When** the Admin selects a "Daily" cron schedule, **Then** the "Hourly" and "Monthly" schedules become mutually deactivated.
2. **Given** a Database Backup configuration, **When** the Admin selects "Cloud" and triggers a test execute, **Then** the system generates a secure database export uniformly located in the designated cloud destination.

---

### User Story 4 - Media Manager Dashboard (Priority: P2)

Admins require a dedicated "Media Manager" view embedded in the platform to comfortably manage, preview, organise, and mass-delete images and files gathered across the entire website via user submissions or manual uploads.

**Why this priority**: File accumulation impacts storage quotas and costs. Admins must have visibility into stored files without navigating individually through user submissions.

**Independent Test**: Can be tested by navigating to the Media Manager and deleting a standalone orphaned image upload.

**Acceptance Scenarios**:

1. **Given** a variety of files uploaded by multiple users, **When** the admin opens the Media Manager, **Then** they see a gallery and list of all centralized files.
2. **Given** a selected file in the Media Manager, **When** the Admin clicks delete, **Then** it is permanently removed from the storage provider.

---

### User Story 5 - Real-time WebSocket Notifications & Analytics (Priority: P2)

Admins need an Analytics Dashboard showcasing high-level statistics of platform utilization. Crucially, they require real-time notifications alerting them immediately when a user has submitted a new form, allowing instant administrative review without manual refreshing.

**Why this priority**: Eliminates administrative friction and transforms the platform into an interactive, live system rather than a statically polled application.

**Independent Test**: Can be tested by leaving an Admin dashboard open in one browser, submitting a form in an incognito window, and seeing the Admin browser react instantaneously with a notification popup.

**Acceptance Scenarios**:

1. **Given** an open Admin Dashboard session, **When** a client form completes processing, **Then** a real-time notification alerts the Admin instantly on-screen.
2. **Given** the Admin Analytics page, **When** the Admin navigates to it, **Then** they observe historical metrics and charts summarizing site activity.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST utilize a centralized configuration object for all environment variables, aborting startup if required variables are missing.
- **FR-002**: System MUST include a script that synchronizes the structure of the primary localization file to secondary files.
- **FR-003**: System MUST include a checking mechanism validating localized keys and detecting unknown/unmapped words via Mapped Key Verification (ensuring structural keys translate correctly across active locales).
- **FR-004**: System MUST automatically store and restore unsubmitted client form progress (drafts).
- **FR-005**: System MUST provide an Admin Settings interface exposing Database Backup protocols and Cron interval limits (Minutely, Hourly, Daily, Monthly — mutually exclusive).
- **FR-006**: System MUST execute database backups and export them securely to Cloudinary utilizing the existing integrated platform infrastructure.
- **FR-007**: System MUST provide an administrative Media Manager aggregating all user and system media uploads for review and deletion.
- **FR-008**: System MUST emit live push/WebSocket notifications directly to active Admin sessions triggered by client data submissions.
- **FR-009**: System MUST encompass an Analytics Dashboard summarizing comprehensive administrative activity (tracking submissions, file storage quotas usage, and chronologically recording overall Admin actions).

### Key Entities

- **SettingsConfiguration**: Handles persistent preferences for automated intervals, active cron jobs, and backup destinations.
- **MediaAsset**: Normalized representation bridging our database records directly to the file storage provider files (displaying size, uploader, format).
- **BackupLog**: Record of backup operations detailing timestamp, status (success/failure), and destination.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of environment variables are statically typed and validated immediately at application launch.
- **SC-002**: The localization synchronization process accurately generates missing key stubs identically matching the source structure without corrupting existing translations, verifying thousands of keys within 5 seconds.
- **SC-003**: Incomplete form inputs survive unlimited browser refreshes allowing seamless 100% form completion continuity.
- **SC-004**: Backups run successfully based purely on the automated configuration choice (saving DB copies flawlessly).
- **SC-005**: Active Admin sessions receive "New Submission" push/socket alerts in under 2 seconds post-client submission.
- **SC-006**: The Media Manager accurately indexes and retrieves centralized files, allowing bulk deletion and visibility of the entire media repository.

## Assumptions

- Users have standard modern browsers supporting persistent local storage for auto-save draft functionality.
- The web server infrastructure provides avenues (such as Server-Sent Events or WebSockets) specifically allowing real-time capabilities.
- Cloud Backup integration implies access to a storage bucket (AWS S3) or utilizing generic scalable file storage solutions, heavily reliant upon secure access keys.
- Analytics requires no tracking of unconsented user data (e.g., precise geolocation) but relies on system database metrics (submissions over time, most active users).
