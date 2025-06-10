# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Lazy initialization for Prisma database client for improved startup performance

### Changed

- Standardized imports and improved formatting consistency across the codebase
- Updated interaction response flags to use `InteractionResponseFlags.Ephemeral` consistently

## [3.1.2] - 2025-01-08

### Added

- Advanced AI commands suite:
  - `guard` - AI-powered moderation and safety features
  - `search` - AI-enhanced search capabilities
  - `tts` - Text-to-speech functionality
  - `aistatus` - Check AI service status
  - `mahinai` - Advanced AI interaction features
  - `code` - AI code generation capabilities
  - `model` - AI model selection and management
  - `reason` - AI reasoning and analysis
  - `stream` - AI streaming responses
  - `tools` - AI tool integration
  - `vision` - AI image analysis
  - `visualize` - AI visualization features
  - `ai_config` - Configure AI settings
- Personality system with reinforcement learning
- AI memory and context management for users and guilds
- Proactive AI interaction capabilities
- WoW-themed personality command
- Russian locale with improved translations
- Multilingual support for all new AI features

### Changed

- Enhanced Lavalink stability with proactive systems
- Improved AI response personalization
- Updated copyright year to 2025

### Fixed

- Various formatting and consistency issues

## [3.1.1] - 2024-12-31

### Added

- Initial AI integration features
- Database models for AI configuration and memory

## [3.1.0] - 2024-12-30

### Added

- Video playback command messages
- Enhanced music streaming capabilities

### Changed

- Updated discord-video-stream to v3.4.0
- Changed default PORT from 3000 to 3050

## [3.0.9] - 2024-10-20

### Added

- CLAUDE.md project guidelines documentation

### Changed

- Updated various dependencies
- Improved README formatting and consistency

## [3.0.0] - 2024-09-15

### Added

- Complete TypeScript rewrite of the bot
- Prisma ORM integration with MongoDB support
- Docker and Docker Compose support
- Hot reload development mode
- Comprehensive internationalization (i18n) system
- Support for multiple languages:
  - English (US)
  - Chinese (CN/TW)
  - French
  - German
  - Hindi
  - Indonesian
  - Japanese
  - Korean
  - Norwegian
  - Polish
  - Portuguese (BR/PT)
  - Russian
  - Spanish (ES)
  - Turkish
  - Vietnamese

### Changed

- Migrated from JavaScript to TypeScript
- Restructured command system with base Command class
- Improved event handling system
- Enhanced database operations with Prisma

### Removed

- Legacy JavaScript codebase

## [2.0.0] - 2024-01-01

### Added

- Lavalink integration for improved audio quality
- Advanced audio filters:
  - 8D audio
  - Bass boost
  - Karaoke
  - Lowpass
  - Nightcore
  - Pitch adjustment
  - Playback rate control
  - Rotation effect
  - Speed control
  - Tremolo
  - Vibrato
- Playlist management system
- Auto-play functionality
- 24/7 mode for continuous playback

### Changed

- Improved queue management
- Enhanced search functionality
- Better error handling

## [1.0.0] - 2023-06-01

### Added

- Initial release
- Basic music playback features
- Queue system
- Volume control
- Skip, pause, resume functionality
- Now playing display
- Basic search capabilities

[Unreleased]: https://github.com/yourusername/mahina-bot/compare/v3.1.2...HEAD
[3.1.2]: https://github.com/yourusername/mahina-bot/compare/v3.1.1...v3.1.2
[3.1.1]: https://github.com/yourusername/mahina-bot/compare/v3.1.0...v3.1.1
[3.1.0]: https://github.com/yourusername/mahina-bot/compare/v3.0.9...v3.1.0
[3.0.9]: https://github.com/yourusername/mahina-bot/compare/v3.0.0...v3.0.9
[3.0.0]: https://github.com/yourusername/mahina-bot/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/yourusername/mahina-bot/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/yourusername/mahina-bot/releases/tag/v1.0.0
