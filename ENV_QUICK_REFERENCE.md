# 🚀 Quick Production Setup Reference

## 📝 Files to Create

### 1. Backend - `/backend/.env`
Copy from `.env.example` and fill in your values

### 2. Frontend - `/frontend/.env.local`  
Copy from `.env.example` and fill in your values

---

## 🔑 Critical Environment Variables

### BACKEND (.env)

| Variable | Value | Get From |
|----------|-------|----------|
| `NODE_ENV` | `production` | You set this |
| `PORT` | `5000` | You set this |
| `MONGO_URI` | `mongodb+srv://...` | MongoDB Atlas |
| `JWT_SECRET` | 64+ char random string | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_EXPIRE` | `7d` | You set this |
| `REFRESH_TOKEN_SECRET` | 64+ char random string | Generate above command |
| `REFRESH_TOKEN_EXPIRE` | `30d` | You set this |
| `FRONTEND_URL` | `https://your-frontend.com` | Your frontend deployed URL |
| `API_BASE_URL` | `https://your-backend.com` | Your backend deployed URL |
| `EMAIL_SERVICE` | `gmail` or `custom` | You set this |
| `EMAIL_USER` | Your email | Your email address |
| `EMAIL_PASSWORD` | App password (Gmail) | See instructions in PRODUCTION_SETUP.md |
| `EMAIL_FROM_NAME` | `ShareMyRide` | Your app name |
| `RAZORPAY_KEY_ID` | `rzp_live_...` | Razorpay Dashboard |
| `RAZORPAY_KEY_SECRET` | Your secret key | Razorpay Dashboard |
| `AWS_ACCESS_KEY_ID` | Your AWS access key | AWS IAM |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret | AWS IAM |
| `AWS_REGION` | `us-east-1` | Your S3 bucket region |
| `AWS_S3_BUCKET` | Your bucket name | AWS S3 |
| `GOOGLE_MAPS_API_KEY` | Your API key | Google Cloud Console |

### FRONTEND (.env.local)

| Variable | Value | Get From |
|----------|-------|----------|
| `VITE_API_URL` | `https://your-backend.com/api` | Your backend deployed URL + `/api` |
| `VITE_GOOGLE_MAPS_API_KEY` | Your API key | Google Cloud Console (same as backend) |
| `VITE_APP_NAME` | `ShareMyRide` | Your app name |
| `VITE_APP_URL` | `https://your-frontend.com` | Your frontend deployed URL |

---

## ⚡ Quick Start Commands

### Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your values
npm install
npm start
```

### Frontend Setup
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your values
npm install
npm run build
```

---

## ✅ Verification

**Test Backend:**
```bash
curl https://your-backend-url/api/health
```

**Test Frontend:**
Open https://your-frontend-url in browser

**Check Environment Variables are Loaded:**
```bash
# Backend: Add this to server.js
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);

# Frontend: Check console
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
```

---

## 🔒 Security Checklist

- [ ] `.env` files added to `.gitignore`
- [ ] No hardcoded URLs in code (using env vars only)
- [ ] HTTPS enabled on all domains
- [ ] Different secrets for dev and prod
- [ ] Razorpay using LIVE keys (not TEST)
- [ ] Email service verified
- [ ] CORS configured
- [ ] Database backups enabled
- [ ] API rate limiting enabled
- [ ] Logging enabled

---

## 🆘 Common Issues & Fixes

### Frontend shows "VITE_API_URL is not set"
**Fix:** Create `.env.local` in frontend directory with `VITE_API_URL` value

### API calls failing with 401/403
**Fix:** Check JWT_SECRET matches between auth and API endpoints

### Emails not sending
**Fix:** Verify EMAIL_USER, EMAIL_PASSWORD in `.env`, check email logs

### Payment not working
**Fix:** Ensure using LIVE keys from Razorpay (not TEST keys)

### CORS errors
**Fix:** Add frontend URL to `allowedOrigins` array in `backend/server.js`

---

## 📚 More Info
See `PRODUCTION_SETUP.md` for detailed deployment guide
