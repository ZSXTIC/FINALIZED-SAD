import fs from 'fs';

async function run() {
  const sql = fs.readFileSync('./supabase/add-feedback-table.sql', 'utf8');
  try {
    const res = await fetch('http://localhost:54321/rest/v1/', {
      method: 'POST',
      headers: {
        // Need service role key, this won't work easily to execute raw SQL.
      }
    });
  } catch (e) {
    console.error(e);
  }
}

run();
