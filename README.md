# GeneralMarket - Hostinger Deployment Guide

## Project Structure
```
generalmarket/
├── admin/          # React admin panel (Vite) → admin.yourdomain.com
├── backend/        # Node/Express API       → api.yourdomain.com
├── frontend/       # React frontend (CRA)   → yourdomain.com
└── package.json    # Root scripts
```

---

## Before Deploying — Replace "yourdomain.com"

Search and replace `yourdomain.com` with your real domain in:
- `frontend/package.json` → `"homepage"` field
- `frontend/.env.production` → `REACT_APP_API_URL`
- `admin/.env.production` → `VITE_API_URL`

---

## Step 1 — Deploy Backend (api.yourdomain.com)

1. hPanel → Websites → Add Website → Node.js Apps
2. Connect GitHub repo
3. Set Root directory: `backend`
4. Build command: `npm install`
5. Start command: `node index.js`
6. Node version: 18.x or 20.x
7. Assign subdomain: `api.yourdomain.com`

### Environment Variables to add in hPanel:
```
NODE_ENV=production
PORT=4000
DB_NAME=olehfidelis
DB_PASWORD=your_real_mongodb_password
CLOUDINARY_NAME=dnptgaida
CLOUDINARY_API_KEY=939816573661889
CLOUDINARY_API_SECRET=your_real_cloudinary_secret
JWT_SECRET=generate_a_long_random_string_here
CLIENT_URL=https://yourdomain.com
ADMIN_URL=https://admin.yourdomain.com
```

---

## Step 2 — Deploy Frontend (yourdomain.com)

1. Build locally:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
2. hPanel → File Manager → public_html
3. Upload ALL contents of `frontend/build/` into `public_html`
4. Upload `frontend/.htaccess` into `public_html`

---

## Step 3 — Deploy Admin (admin.yourdomain.com)

1. Build locally:
   ```bash
   cd admin
   npm install
   npm run build
   ```
2. hPanel → Domains → Subdomains → create `admin.yourdomain.com`
3. Go to the admin subdomain folder in File Manager
4. Upload ALL contents of `admin/dist/` into that folder
5. Upload `admin/.htaccess` into that folder

---

## Step 4 — Enable SSL

hPanel → SSL → Enable Let's Encrypt for:
- yourdomain.com
- admin.yourdomain.com
- api.yourdomain.com

---

## Step 5 — MongoDB Atlas

Make sure your MongoDB Atlas cluster allows connections from Hostinger:
- Atlas → Network Access → Add IP Address → `0.0.0.0/0` (allow all)
  OR add Hostinger's specific server IP for better security.

---

## Local Development

```bash
# Install all dependencies
npm run install:all

# Run each app
npm run dev:backend    # http://localhost:4000
npm run dev:frontend   # http://localhost:3000
npm run dev:admin      # http://localhost:5173
```
