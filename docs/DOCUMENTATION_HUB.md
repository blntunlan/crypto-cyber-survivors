# :FileText: Documentation Hub Protocol

> **Status**: LIVE | **Version**: v1.0 | **Owner**: Core Engine Dev

## :FileText: Protocol Summary
The Documentation Hub is a premium, terminal-style interface designed to showcase the project's technical depth and engineering quality. It serves as a central knowledge hub for both internal architectural references and external player transparency.

## :Rocket: Internal Architecture
The system follows a decoupled, file-based architecture:
- **Source Files**: Markdown (`.md`) files located in the root `/docs` directory.
- **Published Files**: Synced copies in `public/docs` for client-side accessibility.
- **Navigation Registry**: `docs/navigation.json` acts as the single source of truth for the sidebar structure.
- **Renderer Engine**: `DocScreen.tsx` utilizes a custom high-performance React component to transform raw Markdown into a premium "Cyber-Terminal" view.

## :Settings: How to Add Documents
1. **Create Content**: Add a new `.md` file in the appropriate `docs/` subdirectory.
2. **Update Registry**: Add the entry to `docs/navigation.json`.
3. **Publish**: Sync the files from `docs/` to `public/docs/`.
   - *Command*: `npm run docs:sync`
4. **Verify**: Open the Documentation Terminal on the Landing Page to check formatting and links.

## :Target: Design Standards
- **Headings**: Use `# :IconName: Title` for page titles and `## :IconName: Section` for sections.
- **Icons**: Use the `:IconName:` syntax (e.g., `:Shield:`, `:Zap:`, `:Database:`) for visual markers.
- **Formatting**: Use tables for specifications and bold text for core system tokens.
- **Visuals**: Incorporate Mermaid diagrams for complex logic flows.

---
// SYSTEM STATE: READY
// ENCRYPTION: ACTIVE (AES-256)
