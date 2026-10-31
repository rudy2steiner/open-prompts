## ADDED Requirements

### Requirement: Template variables are defined with a structured schema
The system SHALL support prompt templates defining variables using a structured schema that includes at least: variable name, type, required flag, and default value.

#### Scenario: Template includes variable schema
- **WHEN** a prompt is marked as using a template with variables
- **THEN** the system can load the variable schema needed to render the prompt

### Requirement: Templates can be loaded from a local JSON source
The system SHALL support loading prompt templates and their variable schemas from a local JSON file bundled with the application.

#### Scenario: Load templates from local JSON
- **WHEN** the application starts (or the template registry is first accessed)
- **THEN** the system loads templates and variable schemas from a local JSON file and makes them available to the UI

### Requirement: UI MUST render a form from the variable schema
The system SHALL generate an input form from the variable schema so users can provide values before generating an image.

#### Scenario: Render variable form
- **WHEN** the user opens the template-based generation form
- **THEN** the system shows inputs corresponding to each variable in the schema

### Requirement: Variable values MUST be validated before rendering
The system SHALL validate user-provided variable values against the variable schema (required fields, type constraints, and enum constraints) before rendering the final prompt.

#### Scenario: Reject invalid variable input
- **WHEN** the user submits a generation request with invalid variable values
- **THEN** the system prevents job creation and shows validation errors to the user

### Requirement: Rendering MUST be deterministic given the same inputs
The system SHALL produce the same rendered prompt text given the same template text and the same validated variable values.

#### Scenario: Deterministic render
- **WHEN** the same template and variable values are used twice
- **THEN** the system produces identical rendered prompt text

