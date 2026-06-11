# 🚀 Production Deployment Setup Guide

## Overview
This guide will help you set up your ShareMyRide application for production deployment. The app uses environment variables for all configuration, making it secure and scalable.

---

## 📋 What You Need to Configure

### 1. **Backend (.env file)**
Create a `.env` file in the `/backend` directory with all required variables (see `.env.example`)

### 2. **Frontend (.env.local file)**  
Create a `.env.local` file in the `/frontend` directory with frontend-specific variables

---

## 🔧 Step-by-Step Setup

### **STEP 1: Backend Configuration**

#### 1.1 Create Backend `.env` File
```bash
cd backend
cp .env.example .env
# Now edit .env with your values
```

#### 1.2 Set Required Variables

**🗄️ DATABASE**
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/sharemyride?retryWrites=true&w=majority
```
👉 Get this from MongoDB Atlas or your database provider

**🔐 JWT Secrets** (Generate strong random strings)
```bash
# Generate JWT secrets (run in terminal):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and use for:
```env
JWT_SECRET=<your-generated-secret-here>
REFRESH_TOKEN_SECRET=<your-generated-secret-here>
```

**🌐 URLs**
```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-production-frontend-url.com
API_BASE_URL=https://your-production-backend-url.com
```

**📧 Email Service**

**Option A: Gmail (Recommended)**
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=<16-character-app-password>
EMAIL_FROM_NAME=ShareMyRide
```

👉 **How to get Gmail App Password:**
1. Enable 2-factor authentication on your Gmail
2. Go to myaccount.google.com → Security
3. Scroll to "App passwords"
4. Select "Mail" and "Windows Computer"
5. Copy the 16-character password

**Option B: Custom SMTP**
```env
EMAIL_SERVICE=custom
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASSWORD=your-password
EMAIL_FROM_NAME=ShareMyRide
```

**💳 Razorpay Payment Gateway**
```env
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key
```
👉 Get these from Razorpay Dashboard → Settings → API Keys

**☁️ AWS S3 (for document/image storage)**
```env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

**🗺️ Google Maps**
```env
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

---

### **STEP 2: Frontend Configuration**

#### 2.1 Create Frontend `.env.local` File
```bash
cd frontend
cp .env.example .env.local
# Edit with your production values
```

#### 2.2 Essential Variables
```env
# CRITICAL: This must match your backend deployed URL
VITE_API_URL=https://your-production-backend-url.com/api

# Google Maps (same as backend)
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# App Config
VITE_APP_NAME=ShareMyRide
VITE_APP_URL=https://your-production-frontend-url.com
```

**⚠️ IMPORTANT:**
- `VITE_API_URL` must be the EXACT URL where your backend is deployed
- For Render: `https://your-app.onrender.com/api`
- For Vercel Backend: `https://your-backend.vercel.app/api`
- For Custom Domain: `https://api.yourcompany.com/api`

---

## 🚢 Deployment Guide

### **Option 1: Deploy Backend to Render.com**

1. Connect your GitHub repository
2. Create New → Web Service
3. Select your repository
4. Set start command: `npm start`
5. Go to Environment → Add environment variables
6. Copy all variables from your `.env` file
7. Deploy!

### **Option 2: Deploy Backend to Vercel**

1. Create `vercel.json` with serverless configuration
2. Run: `vercel --prod`
3. Add environment variables via Vercel Dashboard
4. Set domains

### **Option 3: Deploy Backend Locally/VPS**

1. Install Node.js
2. Clone repository
3. Run: `npm install`
4. Create `.env` file with all variables
5. Run: `npm start` (or use PM2 for persistence)

### **Deploy Frontend to Vercel/Netlify**

**Vercel:**
```bash
npm install -g vercel
vercel --prod
```

**Netlify:**
```bash
npm run build
# Drag & drop 'dist' folder or use: npm install -g netlify-cli && netlify deploy
```

---

## ✅ Verification Checklist

After deployment, verify everything works:

- [ ] Backend API is responding: `curl https://your-backend-url/api/health`
- [ ] Frontend loads without errors
- [ ] Email verification works (check logs)
- [ ] Payment gateway is connected
- [ ] Database queries work
- [ ] S3 uploads are working
- [ ] Google Maps displays correctly
- [ ] CORS is configured (no blocked requests)

---

## 🐛 Troubleshooting

### **Error: "VITE_API_URL is not set"**
→ Make sure `.env.local` exists in the frontend directory with `VITE_API_URL` set

### **Error: "API call failing from frontend"**
→ Check that `VITE_API_URL` matches where your backend is actually deployed

### **Error: "Email not sending"**
→ Verify email credentials and check backend logs: `tail -f logs.txt`

### **Error: "Razorpay payment not working"**
→ Ensure you're using LIVE keys (not TEST keys) in production

### **Error: "CORS blocked"**
→ Add your frontend URL to `allowedOrigins` in `backend/server.js`

---

## 🔒 Security Best Practices

✅ **DO:**
- Store `.env` files in `.gitignore`
- Use different secrets for dev and production
- Enable HTTPS everywhere
- Use strong, unique passwords
- Enable 2FA on all service accounts
- Regularly rotate API keys

❌ **DON'T:**
- Commit `.env` files to Git
- Share API keys in code
- Use development secrets in production
- Disable CORS for all origins
- Log sensitive information

---

## 📞 Support

For issues, check:
1. Backend logs: `npm run dev` (development) or check server logs
2. Frontend console: F12 → Console tab
3. Network tab: F12 → Network to see API calls
4. Check environment variables are loaded: `console.log(process.env)` (backend) or `console.log(import.meta.env)` (frontend)

---

## 🎯 Summary of URLs to Update

| Service | Development | Production |
|---------|-------------|------------|
| Backend | `http://localhost:5000` | Your deployed backend URL |
| Frontend | `http://localhost:5173` | Your deployed frontend URL |
| Database | Local MongoDB | MongoDB Atlas |
| Email | Gmail/SMTP | Gmail/SMTP (same, but verified) |
| Payments | Razorpay TEST | Razorpay LIVE |
| Storage | Local/test S3 | Production S3 bucket |

All URLs are now **environment-variable driven** ✅
