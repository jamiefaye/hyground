# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start development server:**
```bash
npm run dev
```
- Runs on port 8000 with HTTPS enabled
- Uses self-signed certificates from `./certs/`
- Hot reload enabled

**Build for production:**
```bash
npm run build
```

**Lint code:**
```bash
npm run lint
```
- Uses eslint-config-vuetify
- Auto-fixes issues when possible

**Preview production build:**
```bash
npm run preview
```

## Architecture Overview

This is a Vue 3 + Vuetify 3 application for Hydra visual synthesis with the following key architectural components:

### Core Structure
- **Vue 3 with Composition API** - Modern reactive framework
- **Vuetify 3** - Material Design component library  
- **Vite** - Build tool with HMR
- **File-based routing** - Pages in `src/pages/` automatically become routes
- **Auto-importing** - Components and composables imported automatically
- **Pinia** - State management (minimal usage currently)

### Hydra Integration
- **hydra-synth dependency** - Local file dependency (`file:../hyv`)
- **Hydra.vue** - Core component that wraps Hydra instances with canvas rendering
- **HydraStage.vue** - Stage management for Hydra performances with background synthesis
- **Web Workers** - BGRWorker and MeetupWorker for background processing

### Key Components
- **Editors.vue** - Code editor interface (likely CodeMirror-based)
- **InActorPanel.vue** - Actor/performer interface panels
- **StagePanel.vue** - Stage control interface
- **Splitter.vue** - Layout splitter component
- **TopLevel.vue** - Main application orchestrator

### Development Features
- **HTTPS development server** - Required for web audio/media APIs
- **Auto-imports** - Vue composables, components, and Pinia stores
- **Hot reload** - Instant updates during development
- **Layouts system** - Automatic layout wrapping for pages

### File Organization
- `src/pages/` - File-based routes (index.vue, editor.vue, stage.vue)
- `src/layouts/` - Layout templates  
- `src/components/` - Reusable components
- `src/stores/` - Pinia state stores
- `src/plugins/` - Vue plugin registration
- `src/lib/` - Utility libraries (webcam, screenmedia)

The application is a live coding environment for Hydra visual synthesis with collaborative/performance features.

## Deployment

**Live deployment:** https://www.fentonia.com/hyg/

**Deploy to S3:**
```bash
npm run build
aws s3 sync dist/ s3://www.fentonia.com/hyg/
```

The app uses the local hyv library which includes the vertex extension for 3D geometry, model loading, and WebGPU support.