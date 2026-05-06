# Unit of Work — Story Map — TMS (Project KALAM)

Maps user stories to units of work.

---

## Unit 1: Foundation
| Story ID | Story Title |
|---|---|
| (Foundation) | Monorepo setup, shared types, Prisma schema, seed data |

---

## Unit 2: Backend Core — Auth & Users
| Story ID | Story Title |
|---|---|
| US-AUTH-01 | User Self-Registration |
| US-AUTH-02 | User Login |
| US-AUTH-03 | Admin Role Assignment |
| US-AUTH-04 | Availability Status Update |

---

## Unit 3: Backend Features — Tasks & Socket.io
| Story ID | Story Title |
|---|---|
| US-TASK-01 | View Kanban Board (API) |
| US-TASK-02 | Create Task (API + role guard) |
| US-TASK-03 | Move Task Between Columns (API + socket) |
| US-TASK-04 | Filter Tasks (API) |
| US-TASK-05 | Add Comment to Task (API) |
| US-TASK-06 | Log Time on Task (API) |

---

## Unit 4: Backend AI, Chat & Documents
| Story ID | Story Title |
|---|---|
| US-CHAT-01 | Send Direct Message (API + socket) |
| US-CHAT-02 | Create and Use Group Chat (API + socket) |
| US-CHAT-03 | Send File and Image in Chat (API) |
| US-CHAT-04 | Edit and Delete Messages (API) |
| US-CHAT-05 | Video/Audio Call (WebRTC signaling) |
| US-AI-01 | Summarize / Analyze a Document (API) |
| US-AI-02 | Create AI-Generated Document (API + streaming) |
| US-DOC-01 | Create and Edit Document (API) |
| US-DOC-02 | Share Document (API) |

---

## Unit 5: Frontend Core — Auth, Layout & Dashboard
| Story ID | Story Title |
|---|---|
| US-AUTH-01 | User Self-Registration (UI) |
| US-AUTH-02 | User Login (UI) |
| US-DASH-01 | View Dashboard (UI + charts) |
| US-NOTIF-01 | Receive In-App Notifications (bell icon + badge) |

---

## Unit 6: Frontend Team & Tasks
| Story ID | Story Title |
|---|---|
| US-ORG-01 | View Interactive Org Chart |
| US-ORG-02 | Admin Restructures Org Chart |
| US-ORG-03 | Team Leader Restructures Own Subtree |
| US-ORG-04 | View User Profile Drawer |
| US-TASK-01 | View Kanban Board (UI) |
| US-TASK-02 | Create Task (UI + role-gated modal) |
| US-TASK-03 | Move Task Between Columns (DnD UI) |
| US-TASK-04 | Filter Tasks (UI) |
| US-TASK-05 | Add Comment to Task (UI) |
| US-TASK-06 | Log Time on Task (UI) |

---

## Unit 7: Frontend Chat, AI Tools & Documents
| Story ID | Story Title |
|---|---|
| US-CHAT-01 | Send Direct Message (UI + real-time) |
| US-CHAT-02 | Create and Use Group Chat (UI + real-time) |
| US-CHAT-03 | Send File and Image in Chat (UI) |
| US-CHAT-04 | Edit and Delete Messages (UI) |
| US-CHAT-05 | Video/Audio Call (WebRTC UI) |
| US-AI-01 | Summarize / Analyze a Document (UI) |
| US-AI-02 | Create AI-Generated Document (UI + streaming) |
| US-DOC-01 | Create and Edit Document (TipTap UI) |
| US-DOC-02 | Share Document (UI + ShareModal) |

---

## Unit 8: Polish, Testing & Finalization
| Story ID | Story Title |
|---|---|
| US-NOTIF-01 | Receive In-App Notifications (full real-time integration) |
| (All stories) | Animations, skeleton loaders, error states, responsive layout |
| (Testing) | PBT tests, unit tests, integration tests |
| (Docs) | README, .env.example, final smoke test |

---

## Story Coverage Summary

| Epic | Total Stories | Covered |
|---|---|---|
| Authentication & User Management | 4 | 4 |
| Org Chart & Team Hierarchy | 4 | 4 |
| Task Management | 6 | 6 |
| Real-Time Chat | 5 | 5 |
| AI Tools | 2 | 2 |
| Documents | 2 | 2 |
| Dashboard & Analytics | 1 | 1 |
| Notifications | 1 | 1 |
| **Total** | **25** | **25** |
