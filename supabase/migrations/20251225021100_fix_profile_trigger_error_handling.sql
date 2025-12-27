/*
  # Fix profile and bookmark list triggers with error handling
  
  1. Changes
    - Add exception handling to both trigger functions
    - Ensure signup doesn't fail even if profile/list creation fails
  
  2. Security
    - Functions run with SECURITY DEFINER to bypass RLS
*/

-- Fix the handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'User')
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix the create_default_bookmark_lists function with error handling
CREATE OR REPLACE FUNCTION public.create_default_bookmark_lists()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO bookmark_lists (user_id, name, is_public)
    VALUES 
      (NEW.id, '買いたい本', false),
      (NEW.id, 'オススメの本', false);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create default lists for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;