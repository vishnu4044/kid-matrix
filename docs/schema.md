# Kid Matrix — Database Schema

SQLite for MVP; models written so a later move to PostgreSQL only requires swapping the connection
string (no SQLite-specific types used).

## User
| field | type | notes |
|---|---|---|
| id | Integer PK | |
| name | String(120) | parent's display name |
| email | String(255) unique, indexed | login identifier |
| password_hash | String(255) | pbkdf2 hash, never plaintext |
| created_at | DateTime | server default now |
| updated_at | DateTime | onupdate now |

Relationships: `children` (1-to-many → Child).

## Child
| field | type | notes |
|---|---|---|
| id | Integer PK | |
| parent_id | Integer FK → User.id | |
| name | String(120) | |
| age | Integer | |
| grade | String(50) | e.g. "Kindergarten", "Grade 1" |
| avatar | String(255) nullable | avatar id/emoji/URL |
| learning_goals | JSON nullable | e.g. ["Letters","Numbers"] — Phase 1 stores it, UI for editing goals beyond creation is Phase 2+ |
| created_at / updated_at | DateTime | |

## PracticeSession (table created now, unused until Phase 2)
| field | type | notes |
|---|---|---|
| id | Integer PK | |
| child_id | Integer FK → Child.id | |
| type | String(50) | letters / numbers / math / shapes / mixed / ai |
| title | String(255) | |
| difficulty | String(50) nullable | |
| status | String(20) | pending / in_progress / completed |
| started_at / completed_at | DateTime nullable | |
| score | Float nullable | |
| total_questions | Integer | |

## Question (table created now, unused until Phase 2)
| field | type | notes |
|---|---|---|
| id | Integer PK | |
| session_id | Integer FK → PracticeSession.id | |
| type | String(50) | letter / number / math / shape |
| prompt | String(255) | |
| target | String(255) | e.g. "A", "circle" |
| expected_answer | String(255) nullable | |
| order_index | Integer | |
| metadata_json | JSON nullable | (`metadata` is reserved by SQLAlchemy, mapped to column `metadata_json`) |

## Answer (table created now, unused until Phase 3)
| field | type | notes |
|---|---|---|
| id | Integer PK | |
| question_id | Integer FK → Question.id | |
| child_id | Integer FK → Child.id | denormalized for fast per-child queries |
| answer | String(255) nullable | recognized text answer, if applicable |
| image_path | String(255) nullable | path under `uploads/handwriting/` |
| is_correct | Boolean nullable | |
| confidence | Float nullable | |
| feedback | String(255) nullable | |
| created_at | DateTime | |

## Progress (table created now, unused until Phase 4)
| field | type | notes |
|---|---|---|
| id | Integer PK | |
| child_id | Integer FK → Child.id | |
| subject | String(50) | letters / numbers / math / shapes |
| topic | String(50) | e.g. "A", "addition" |
| attempts | Integer default 0 | |
| correct | Integer default 0 | |
| accuracy | Float default 0 | |
| last_practiced | DateTime nullable | |

## AIInteraction (table created now, unused until Phase 5)
| field | type | notes |
|---|---|---|
| id | Integer PK | |
| child_id | Integer FK → Child.id, nullable | null for parent-only questions |
| parent_id | Integer FK → User.id | |
| question | Text | |
| response | Text | |
| created_at | DateTime | |

All tables are created in Phase 1 via `db.create_all()` (Flask-Migrate can be introduced later)
so no destructive migration is needed when Phase 2+ starts writing to them.
