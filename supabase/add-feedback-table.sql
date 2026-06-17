-- Create feedbacks table
CREATE TABLE feedbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  type TEXT NOT NULL,
  rating INTEGER,
  subject TEXT NOT NULL,
  message TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- Allow insert for anyone
CREATE POLICY "Anyone can insert feedbacks" 
  ON feedbacks FOR INSERT 
  WITH CHECK (true);

-- Allow admins to read feedbacks
CREATE POLICY "Admins can view all feedbacks" 
  ON feedbacks FOR SELECT 
  USING (
    auth.uid()::text IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );
