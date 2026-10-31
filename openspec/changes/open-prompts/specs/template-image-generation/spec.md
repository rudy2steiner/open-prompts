## ADDED Requirements

### Requirement: User can generate images from a prompt template
The system SHALL allow an authenticated user to start an image generation using a prompt template and user-provided variable values, without leaving the Open Prompts site.

#### Scenario: Start generation from prompt detail modal
- **WHEN** the user opens a prompt detail view and clicks “立即生图”
- **THEN** the system shows a template-based generation form and allows the user to submit a generation request

### Requirement: Start generation returns a provider job identifier
The system SHALL return a provider job identifier when a generation request is started so the client can poll for status without requiring persistence.

#### Scenario: Start returns provider job id
- **WHEN** the user submits a generation request
- **THEN** the system returns a `provider` and `providerJobId` for subsequent polling

### Requirement: Rendered prompt MUST be available for the in-flight session
The system SHALL retain the fully rendered prompt (and negative prompt if provided) for the duration of an in-flight generation flow so that it can be displayed to the user and used for polling/retry within the same session, without requiring persistent storage.

#### Scenario: Rendered prompt is shown during polling
- **WHEN** the user starts generation and the UI is polling for status
- **THEN** the UI can display the rendered prompt used for that generation request

### Requirement: User can select model and output size/aspect ratio
The system SHALL allow the user to select a target model (or provider model identifier) and an output size/aspect ratio for the generation request, limited to supported options.

#### Scenario: User selects model and aspect ratio
- **WHEN** the user selects a model and chooses an aspect ratio preset
- **THEN** the system validates the selection against supported options for that model/provider

### Requirement: System supports multiple generation providers
The system SHALL support multiple image generation providers and MUST allow selecting a provider for a generation request, with a sensible default provider when the user does not choose.

#### Scenario: Default provider is used
- **WHEN** the user submits a generation request without explicitly selecting a provider
- **THEN** the system uses the configured default provider to create the generation job

### Requirement: Client can poll generation status using provider job identifier
The system SHALL allow the client to poll the status of an in-flight generation request using the provider job identifier, returning a normalized status.

#### Scenario: Polling returns running status
- **WHEN** the client polls using the `providerJobId` while the provider is still generating
- **THEN** the system returns a status indicating the request is in progress (e.g., queued or running)

### Requirement: Generation result MUST be viewable and downloadable
The system SHALL display generated images in the UI and provide a download action for each generated image.

#### Scenario: View and download results
- **WHEN** a generation request reaches a successful completion state
- **THEN** the user can view the resulting images and download each image

### Requirement: Results MAY be served directly from provider URLs in MVP
The system SHALL support returning provider-hosted result URLs for display and download in the MVP, without storing them in application-managed storage.

#### Scenario: Provider URL results
- **WHEN** a generation request succeeds in the MVP
- **THEN** the system can return provider-hosted image URLs that the client can display and download

