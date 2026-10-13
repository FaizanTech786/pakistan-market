# Pakistan Market

Admin-mediated marketplace/PWA. Listings are submitted for approval. Buyers do not receive seller contact details; conversations are mediated by Pakistan Market Admin. Admin can list Pakistan Market-owned products, manage listings, mediate chat, create and update deals, and manage users.

## Run
1. Install Node.js LTS.
2. In this folder run `npm install`.
3. Set environment variables (PowerShell example):
   `$env:ADMIN_EMAIL='your-admin-email'`
   `$env:ADMIN_PASSWORD='your-strong-admin-password'`
   `$env:JWT_SECRET='long-random-secret'`
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

## Features
- English/Urdu language toggle.
- Admin approval workflow.
- Admin-owned and user-owned listings.
- Buyer -> Admin -> Seller mediated conversations.
- Text, image, audio and document attachments in chat.
- Admin-managed deal lifecycle: pending payment, payment received, seller confirmed, completed, cancelled.
- Marketplace disclaimer in English and Urdu.
- PWA manifest for installable web app.

## Production notes
This v1 uses a JSON file and local uploads for simple deployment/demo. For production scale, migrate to PostgreSQL/MongoDB, object storage, HTTPS, rate limiting, antivirus/file scanning, audit logs, backups, payment provider and a production process manager. Do not put real secrets in source control.
