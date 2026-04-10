# GeneralMarket — Unified Hostinger Deployment

## Structure
Everything is in ONE folder. No subdomains needed.

```
generalmarket/
├── server.js          ← Express backend (Node.js entry point)
├── cloudinary.js      ← Cloudinary config
├── schema/            ← MongoDB models
├── src/               ← React source code
├── public/            ← React public files
├── package.json       ← All dependencies
└── .env               ← Environment variables (fill in your values)
```

---

## Step 1 — Fill in your .env values

Open `.env` and replace the placeholder values:

```
NODE_ENV=production
PORT=4000
DB_NAME=olehfidelis
DB_PASWORD=YOUR_REAL_MONGODB_PASSWORD
CLOUDINARY_NAME=dnptgaida
CLOUDINARY_API_KEY=939816573661889
CLOUDINARY_API_SECRET=YOUR_REAL_CLOUDINARY_SECRET
JWT_SECRET=any_long_random_string_you_choose
```

---

## Step 2 — Build React locally before deploying

Run this on your computer:

```bash
npm install
npm run build
```

This creates a `build/` folder. Push everything (including `build/`) to GitHub.

---

## Step 3 — Deploy on Hostinger hPanel

1. hPanel → Websites → Add Website → **Node.js App**
2. Connect your GitHub repo
3. Set:
   - **Root directory:** `/` (leave empty / root)
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
   - **Node version:** 18.x or 20.x
4. Click Deploy

---

## Step 4 — Add Environment Variables in hPanel

After deploying, go to your app settings → **Environment Variables** and add all values from your `.env` file.

Then **Restart** the app.

---

## Step 5 — MongoDB Atlas

Allow Hostinger to connect to your database:
- MongoDB Atlas → Network Access → Add IP → **0.0.0.0/0** (Allow from anywhere)

---

## URLs after deployment

| Page | URL |
|---|---|
| Frontend shop | yourdomain.com |
| Admin panel | yourdomain.com/#/admin |
| API test | yourdomain.com/api/allproduct |

> Access the admin at: `yourdomain.com/#/admin`

---

## Local development

```bash
npm install
npm run dev      # starts backend on port 4000
# In separate terminal:
npm start        # starts React on port 3000
```
