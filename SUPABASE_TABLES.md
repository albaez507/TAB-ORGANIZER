# Supabase Tables & RLS Requirements

## Table 1: shared_libraries

### Columns
- id (uuid, primary key)
- sender_id (uuid, references auth.users)
- sender_email (text)
- recipient_email (text)
- library_name (text)
- library_icon (text)
- library_data (jsonb)
- status (text) - values: 'pending', 'sent', 'accepted', 'declined'
- created_at (timestamptz)
- seen_at (timestamptz, nullable)

### Queries Found

| # | File | Function | Operation | Condition |
|---|------|----------|-----------|-----------|
| 1 | sharing.js:296 | sendSharedLibrary() | INSERT + SELECT (.select().single()) | sender_id = auth.uid() |
| 2 | notifications.js:94 | fetchPendingShares() | SELECT | recipient_email = auth.email() AND status = 'sent' |
| 3 | notifications.js:221 | dismissSharedLibrary() | UPDATE (status → 'declined') | id = shareId |
| 4 | share-preview.js:19 | openSharePreview() | SELECT (single by id) | id = shareId |
| 5 | share-preview.js:85 | openSharePreview() | UPDATE (seen_at) | id = shareId |
| 6 | share-preview.js:347 | doImport() | UPDATE (status → 'accepted') | id = shareId |
| 7 | share-preview.js:373 | dismissFromPreview() | UPDATE (status → 'declined') | id = shareId |

### Realtime Subscription
- **File:** notifications.js:44
- **Channel:** shared-libraries-notifications
- **Events:** * (INSERT, UPDATE, DELETE)
- **Filter:** recipient_email=eq.{currentUser.email}

### Edge Function Call
- **File:** sharing.js:312
- **Function:** send-share-email
- **Called after:** INSERT (passes record in body)

### Required RLS Policies

```sql
-- Enable RLS
ALTER TABLE shared_libraries ENABLE ROW LEVEL SECURITY;

-- 1. INSERT: Authenticated users can insert shares where they are the sender
CREATE POLICY "Users can insert their own shares"
ON shared_libraries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- 2. SELECT: Users can read shares where they are sender OR recipient
CREATE POLICY "Users can view shares they sent or received"
ON shared_libraries
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid()
  OR recipient_email = (auth.jwt() ->> 'email')
);

-- 3. UPDATE: Recipients can update shares sent to them (accept, decline, mark seen)
CREATE POLICY "Recipients can update their received shares"
ON shared_libraries
FOR UPDATE
TO authenticated
USING (recipient_email = (auth.jwt() ->> 'email'))
WITH CHECK (recipient_email = (auth.jwt() ->> 'email'));
```

---

## Table 2: tab_organizer

### Columns (inferred from code)
- id (uuid or serial, primary key)
- user_id (uuid, references auth.users)
- url (text)
- title (text)
- category (text — stores JSON stringified DATA)
- updated_at (timestamptz)

### Queries Found

| # | File | Function | Operation | Condition |
|---|------|----------|-----------|-----------|
| 1 | storage.js:49 | save() | SELECT (check existing) | user_id = currentUser.id |
| 2 | storage.js:66 | save() | UPDATE (existing row) | id = existing.id |
| 3 | storage.js:77 | save() | INSERT (new row) | user_id = currentUser.id |
| 4 | storage.js:112 | loadFromCloud() | SELECT | user_id = currentUser.id |

### Required RLS Policies

```sql
-- Enable RLS
ALTER TABLE tab_organizer ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Users can only read their own data
CREATE POLICY "Users can read own data"
ON tab_organizer
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. INSERT: Users can only insert their own data
CREATE POLICY "Users can insert own data"
ON tab_organizer
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE: Users can only update their own data
CREATE POLICY "Users can update own data"
ON tab_organizer
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

## Table: users

**NOT FOUND in the codebase.** No queries to `.from('users')` exist. The "permission denied for table users" error may come from Supabase internals or a Realtime subscription referencing auth metadata. This is NOT caused by app code.

---

## Combined SQL Script (copy-paste into Supabase SQL Editor)

```sql
-- ============================================
-- shared_libraries RLS
-- ============================================
ALTER TABLE shared_libraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own shares"
ON shared_libraries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view shares they sent or received"
ON shared_libraries
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid()
  OR recipient_email = (auth.jwt() ->> 'email')
);

CREATE POLICY "Recipients can update their received shares"
ON shared_libraries
FOR UPDATE
TO authenticated
USING (recipient_email = (auth.jwt() ->> 'email'))
WITH CHECK (recipient_email = (auth.jwt() ->> 'email'));

-- ============================================
-- tab_organizer RLS
-- ============================================
ALTER TABLE tab_organizer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
ON tab_organizer
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
ON tab_organizer
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
ON tab_organizer
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

## Realtime Setup

Realtime must be enabled on the `shared_libraries` table:
1. Supabase Dashboard > Database > Replication
2. Enable Realtime on `shared_libraries`
3. Or via SQL: `ALTER PUBLICATION supabase_realtime ADD TABLE shared_libraries;`
