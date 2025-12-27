/*
  # Add foreign key constraint for book_id

  1. Changes
    - Add foreign key constraint from bookmark_list_items.book_id to books.id
    - This enables Supabase's relationship queries between bookmark_list_items and books
  
  2. Notes
    - Uses ON DELETE CASCADE so that deleting a book removes related bookmark items
    - IF NOT EXISTS prevents errors if constraint already exists
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'bookmark_list_items_book_id_fkey'
      AND table_name = 'bookmark_list_items'
  ) THEN
    ALTER TABLE bookmark_list_items
      ADD CONSTRAINT bookmark_list_items_book_id_fkey
      FOREIGN KEY (book_id)
      REFERENCES books(id)
      ON DELETE CASCADE;
  END IF;
END $$;
