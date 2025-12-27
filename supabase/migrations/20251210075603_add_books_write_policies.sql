/*
  # Add write policies for books table

  1. Changes
    - Add INSERT policy to allow anyone to add books to the database
    - Add UPDATE policy to allow anyone to update book information
  
  2. Security
    - Books table contains public information (from APIs)
    - Allow public access for INSERT and UPDATE operations
    - This enables the app to cache book data from external APIs
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'books' 
    AND policyname = 'Anyone can insert books'
  ) THEN
    CREATE POLICY "Anyone can insert books"
      ON books
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'books' 
    AND policyname = 'Anyone can update books'
  ) THEN
    CREATE POLICY "Anyone can update books"
      ON books
      FOR UPDATE
      TO public
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
