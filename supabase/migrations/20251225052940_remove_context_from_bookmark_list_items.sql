/*
  # Remove context column from bookmark_list_items

  1. Changes
    - Drop the `context` column from `bookmark_list_items` table
    - This column is no longer needed as the memo feature has been removed from the UI
  
  2. Notes
    - This operation will permanently remove all existing memo data
    - The column drop is safe as the feature has been removed from the application
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookmark_list_items' AND column_name = 'context'
  ) THEN
    ALTER TABLE bookmark_list_items DROP COLUMN context;
  END IF;
END $$;
