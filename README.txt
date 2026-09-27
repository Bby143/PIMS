PIMS Admin Dashboard
====================

POGA International Management System

Files:
- admin.html
- admin.js
- admin-style.css

Upload these files to the same GitHub repository as the public PIMS registration page.

Then open:

/admin.html

The dashboard requires a Supabase Auth email/password account.

Members do not log in.

Only authenticated users can access member records under the current RLS setup.

Member photos are stored in a private Supabase Storage bucket.

The dashboard uses temporary signed URLs for authenticated administrators.

Features:
- Admin login
- View members
- Search members
- Filter by location
- View member details
- View private member photo
- Edit member
- Delete member
- Print member record
- Active/inactive status
- Total member count
- Location count
