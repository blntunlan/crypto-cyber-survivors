# Documentation Hub

Status: live
Owner: Core Engineering

## Purpose

The documentation surface is split into two layers:

- active docs in `docs/` that must match the running codebase
- archived docs in `docs/archived/` that are preserved only for historical reference

`public/docs/` mirrors the same structure for the in-app documentation viewer.

## Maintenance rules

1. Only current architecture, workflow, service, and setup docs stay in the active tree.
2. Historical roadmaps, superseded migration plans, and replaced designs are moved to `docs/archived/`.
3. `docs/navigation.json` should list only active documents that are still useful to engineers and operators.
4. If a code symbol keeps a legacy name for compatibility, document that clearly instead of pretending the old backend still exists.

## Update workflow

1. Edit the source document in `docs/`.
2. Mirror the change into `public/docs/`.
3. Update `docs/navigation.json` and `public/docs/navigation.json` if the active surface changed.
4. Archive or remove public-only orphan files when their source document no longer exists.

## Archive policy

Use the archive when a document is any of the following:

- implementation plan that has been superseded
- migration note tied to a retired backend path
- design draft that no longer matches the shipped runtime
- public mirror file with no matching source document
