// backend/src/migrations.js
// Run this ONCE to update the database schema

const supabase = require('./config/supabase');

async function runMigrations() {
  console.log('Starting database migrations...');
  
  try {
    // Migration 1: Add verification columns to users table
    console.log('Migration 1: Adding verification columns to users table...');
    
    const { error: error1 } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS date_of_birth DATE,
        ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS verification_submitted BOOLEAN DEFAULT FALSE;
      `
    });

    if (error1 && !error1.message.includes('already exists')) {
      console.error('Error in Migration 1:', error1);
    } else {
      console.log('✓ Migration 1 complete');
    }

    // Migration 2: Create verifications table
    console.log('Migration 2: Creating verifications table...');
    
    const { error: error2 } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS verifications (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          document_type VARCHAR(20) NOT NULL,
          document_number VARCHAR(50) NOT NULL,
          document_front_url TEXT NOT NULL,
          document_back_url TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          reviewed_by UUID REFERENCES users(id),
          reviewed_at TIMESTAMP WITH TIME ZONE,
          rejection_reason TEXT,
          submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          approved_at TIMESTAMP WITH TIME ZONE,
          UNIQUE(user_id)
        );
      `
    });

    if (error2 && !error2.message.includes('already exists')) {
      console.error('Error in Migration 2:', error2);
    } else {
      console.log('✓ Migration 2 complete');
    }

    console.log('\n✓ All migrations complete!\n');
    process.exit(0);

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigrations();