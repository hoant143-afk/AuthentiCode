# AuthentiCode – Assessment Platform

An assessment platform for evaluating junior high school students' Python programming skills in the age of generative AI.

> [!IMPORTANT]
> The system requires Firebase for authentication and data storage. I will use Cloud Firestore for persistent storage of student submissions, assessment logs, and teacher evaluations.

### 1. Overview & Core Concept
- **What It Does**: Provides a structured environment for teachers to assign tasks, and for students to submit Python solutions, with integrated AI support and assessment rubrics.
- **Target Audience / Persona**: Junior high school teachers (evaluating) and students (learning/submitting).
- **Key Value**: Provides a structured, verified evaluation process for Python programming, assessing both the final code and the process (analysis, AI usage, explanation).

### 2. User Experience & Visual Design
- **Key User Flows**:
    - Teacher: Login -> Dashboard -> Create Class -> Create Task -> Assign -> Grade Submissions -> Vistualize Reports.
    - Student: Login with Session Code -> View Tasks -> Submit Code/Logs -> Receive Feedback.
- **Visual Identity & Theme**:
    - Professional, clean, modern educational tool.
    - Colors: White background, soft green/blue accents (Tailwind: `slate-50`, `emerald-500`, `blue-600`).
    - Typography: Clean sans-serif (e.g., Inter/system).
- **Interactive Feedback**: Loading states, submission confirmation, clear error messages.

### 3. Key Product Decisions & Trade-Offs
- **Decision 1**: Firebase Auth + Firestore.
    - *Chosen Approach*: Managed Firebase services.
    - *Why*: Reliable, scalable, secure, and fits within requirements.
- **Decision 2**: Server-side AI Calls.
    - *Chosen Approach*: Gemini API via server-side endpoints.
    - *Why*: Security (no client-side API keys), better control.

### 4. Technical Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                       Client (React)                        │
├───────────────────────┬────────────┬────────────────────────┤
│     Auth & State      │  UI Views  │  Assessment & Test UI  │
└───────────────────────┴─────┬──────┴────────────────────────┘
                              │ API Calls
┌─────────────────────────────▼───────────────────────────────┐
│                    Server (Express / Vite)                  │
├───────────────────────┬────────────┬────────────────────────┤
│     Gemini API Proxy  │ Auth Check │   Firestore Gateway    │
└───────────────────────┴─────┬──────┴────────────────────────┘
                              │ DB Ops
┌─────────────────────────────▼───────────────────────────────┐
│                    Firebase (Auth / Firestore)              │
└─────────────────────────────────────────────────────────────┘
```

- **Data Model**:
    - `users`: (Roles: Admin, Teacher, Student)
    - `classes`: (Class info, teacherRef, studentList)
    - `tasks`: (Task details, type, AI rules)
    - `submissions`: (StudentRef, TaskRef, Code, Logs, AI interaction, RubricScore)
