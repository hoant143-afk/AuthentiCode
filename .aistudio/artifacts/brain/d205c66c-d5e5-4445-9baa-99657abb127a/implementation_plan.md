# AuthentiCode Refactoring and Migration Plan

## Objectives
1.  Secure the application (Auth, Firestore Rules, API authorization).
2.  Migrate data from `authenticode_db.json` to Firestore.
3.  Implement updated student login, assignment logic, and AI-level evaluation.

## Phase 1: Security Hardening & Firebase Auth
-   [ ] Initialize Firebase Auth in `server.ts` and React.
-   [ ] Implement secure Firestore Security Rules.
-   [ ] Remove hardcoded admin credentials and credentials in UI.
-   [ ] Sanitize API endpoints to block unauthorized access.

## Phase 2: Data Migration
-   [ ] Develop migration script to transform `authenticode_db.json` into Firestore collections (users, classes, students, tasks, assignments, submissions, evaluations, auditLogs).
-   [ ] Verify data integrity post-migration.
-   [ ] Update `server.ts` to use Firestore repository instead of local JSON file.

## Phase 3: Student Portal & Assignment Refactoring
-   [ ] Update student portal for class-based login.
-   [ ] Implement Assignment logic (General vs Individual).
-   [ ] Update API to validate access rights.

## Phase 4: Feature Refinement
-   [ ] Update assessment logic to rely on `aiLevel` property.
-   [ ] Finalize UI/UX for evaluation features (Rubric, AI Logs, Oral Defense).

## Phase 5: Verification & Testing
-   [ ] Execute the requested 10-point test checklist.
-   [ ] Report on security and functional status.
