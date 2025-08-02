# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start the development server on localhost:3000 
- `npm run build` - Build the production version
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint for code quality checks

## Project Architecture

This is a Next.js 14 TypeScript project implementing a 3D perspective racing game rendered on HTML5 Canvas.

### Core Game Architecture

The game uses a component-based architecture with canvas rendering:

- **Game Component** (`app/components/Game.tsx`) - Main game orchestrator that manages:
  - Canvas setup and rendering loop (60fps)
  - Game state (ship position, scrolling offset, path generation)
  - Animation frame management with `requestAnimationFrame`
  - Automatic tile generation for endless scrolling

- **Rendering Components** - Functional components that draw to canvas context:
  - `Ship.ts` - Renders triangular ship sprite with perspective transformation
  - `Track.ts` - Draws vertical track lines using perspective
  - `Path.tsx` - Renders blue path tiles that form the playable track

- **Perspective System** (`app/utils/perspective.ts`):
  - `transformPerspective()` function creates 3D depth illusion
  - Uses cubic scaling factor for realistic perspective distortion
  - All visual elements transformed through this system

### Game Mechanics

- **Scrolling System**: Continuous vertical movement with tile recycling
- **Path Generation**: Procedural random path that connects tiles
- **Grid System**: 7-column track layout with ship positioning
- **Canvas Rendering**: Direct 2D context manipulation for performance

### Technology Stack

- Next.js 14 with App Router
- TypeScript with strict mode
- Tailwind CSS + DaisyUI for styling
- HTML5 Canvas for game rendering
- Tone.js library (available but not currently used)

### File Structure

- `app/game/page.tsx` - Game page with score display
- `app/components/` - All game rendering components
- `app/utils/` - Shared utilities (perspective calculations)
- Standard Next.js App Router structure

### Canvas Rendering Pattern

Components receive canvas context and render directly to it. The main Game component orchestrates the rendering loop and manages all game state updates.