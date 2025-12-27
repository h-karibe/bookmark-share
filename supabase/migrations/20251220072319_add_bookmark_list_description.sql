/*
  # Add description field to bookmark lists

  1. Changes
    - Add `description` column to `bookmark_lists` table
      - Stores optional description/comment for each bookmark list
      - Text type, nullable, defaults to empty string

  2. Notes
    - This allows users to add context and notes to their bookmark lists
    - No RLS changes needed as this is just adding a column to existing table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookmark_lists' AND column_name = 'description'
  ) THEN
    ALTER TABLE bookmark_lists ADD COLUMN description text DEFAULT '';
  END IF;
END $$;
