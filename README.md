# Infinitee PrintFlow DB#

`Infinitee PrintFlow DB` is a polished apparel ordering and approval platform for **Infinitee Studio Apparel Enterprise**. It includes:

- Dual access portals for `user` and `admin`
- Account creation and basic password reset flow
- Category-based product browsing with branded visuals
- Order placement for ready-made apparel
- Custom design submission with image upload and approval workflow
- Fake card payment after admin approval
- Admin product management, order moderation, ETA/rejection handling, top seller insights, and printable monthly reports
- Dark mode and light mode with responsive UX

## Run Locally

This project is intentionally dependency-light, so you can run it without installing a frontend framework stack first.

1. Open the project folder.
2. Start the local server:

```bash
node server.mjs
```

Or:

```bash
npm run dev
```

3. Visit [http://localhost:4173](http://localhost:4173)

## Demo Credentials

The app runs entirely on Supabase cloud storage (no browser `localStorage`). Session tokens are held in memory.

## Supabase Setup

1. Create a new Supabase project.
2. In Supabase SQL Editor, run [supabase/schema.sql](/C:/Users/User/SAD%20FINAL%20PROJECT/supabase/schema.sql).
3. In `Authentication > Providers > Email`, disable email confirmation for easier project demos, or configure email delivery properly.
4. Create a `.env` file in the project root (same folder as `server.mjs`):

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
ENABLE_SUPABASE=true
```

5. Start (or restart) the local server with `node server.mjs`.

> Alternative (quick demo): you can also hardcode these values in [src/config.js](/C:/Users/User/SAD%20FINAL%20PROJECT/src/config.js), but `.env` is preferred.

```js
export const APP_CONFIG = {
  appName: "Infinitee PrintFlow DB",
  companyName: "Infinitee Studio Apparel Enterprise",
  enableSupabase: true,
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",
  designBucket: "design-uploads",
  demoAdmin: {
    email: "admin@infinitee.studio",
    password: "Admin@123"
  },
  demoUser: {
    email: "user@infinitee.studio",
    password: "User@123"
  }
};
```

6. Create a normal account through the app.
7. Promote that account to admin in Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'your-admin-email@example.com';
```

## Important Notes

- In demo mode, the password reset uses a visible OTP for presentation convenience.
- In Supabase mode, password reset uses Supabase email recovery.
- The current Supabase implementation keeps payment as a client-side fake transaction for coursework/demo use.
- Product visuals are generated in-app as SVG illustrations, while custom design uploads use Supabase Storage when connected.

## Sustainability And UX Notes

This project was designed around rubric-friendly considerations:

- `Made-to-order approval flow` reduces waste from producing unapproved custom garments.
- `Dark/light theme` improves comfort across environments.
- `Clear rejection reasons and ETA messaging` support transparent, ethical user communication.
- `Responsive layout, contrast-conscious colors, and reduced-motion respect` improve accessibility.
- `Monthly reporting and bestseller analytics` strengthen operational decision-making.
