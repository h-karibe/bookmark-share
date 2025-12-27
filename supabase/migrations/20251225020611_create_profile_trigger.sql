/*
  # Create automatic profile creation trigger
  
  1. Changes
    - Create trigger function to automatically create profile when user signs up
    - Add trigger on auth.users table
    - Remove manual insert policy (not needed with trigger)
  
  2. Security
    - Profiles are automatically created on user signup
    - Users can still read and update their own profiles
*/

-- Drop the manual insert policy if it exists
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create function to automatically create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();