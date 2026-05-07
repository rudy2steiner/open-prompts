## ADDED Requirements

### Requirement: Persistent generation jobs are a later iteration capability
The system SHALL allow implementing persistent generation jobs (jobs/results stored and queryable over time), but the MVP MAY operate without any persistence by directly polling the provider using a provider job identifier.

#### Scenario: MVP operates without persistence
- **WHEN** the user starts a generation request in the MVP
- **THEN** the system can return a provider job identifier and allow polling without storing the job in a database

### Requirement: Generation jobs have a well-defined lifecycle
The system SHALL represent each image generation request as a job with a lifecycle state, including at minimum: queued, running, succeeded, and failed.

#### Scenario: Job transitions to succeeded
- **WHEN** the provider completes the generation successfully
- **THEN** the job state becomes succeeded and results are attached to the job

### Requirement: Users can query job status and results
The system SHALL allow an authenticated user to retrieve the current status and results of their generation jobs, either via persistent job records (later iteration) or by polling provider job identifiers (MVP).

#### Scenario: Poll job status
- **WHEN** the user requests job status for a job they created
- **THEN** the system returns the job state and any available results

### Requirement: Users can view a history of their jobs
The system SHALL provide a way for users to view a list of their past generation jobs, ordered by creation time.

#### Scenario: View generation history
- **WHEN** the user opens their generation history view
- **THEN** the system lists their jobs with status and creation time

### Requirement: Failed jobs can be retried
The system SHALL allow a user to retry a failed job, creating a new job that reuses the same rendered prompt and parameters unless the user changes them.

#### Scenario: Retry a failed job
- **WHEN** the user clicks “重试” on a failed job
- **THEN** the system creates a new job and returns its identifier

