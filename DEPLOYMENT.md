# SocketMetrics Deployment Guide

## Overview

SocketMetrics is a real-time cryptocurrency data aggregation system with a React frontend and Node.js backend. Due to the nature of the application (WebSocket connections, persistent data storage), a hybrid deployment approach is recommended.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │  Node.js Backend│    │  MongoDB Atlas  │
│   (Vercel)      │◄──►│  (Railway/Render│◄──►│  (Cloud DB)     │
│                 │    │  /Heroku)       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   WebSocket     │    │   Binance API   │
│   Client        │    │   (External)    │
└─────────────────┘    └─────────────────┘
```

## Frontend Deployment (Vercel)

### Prerequisites
- Vercel account
- GitHub repository with your code
- Backend deployed and accessible

### Steps

1. **Prepare Environment Variables**
   ```bash
   # In Vercel dashboard, add these environment variables:
   REACT_APP_API_URL=https://your-backend-url.com
   REACT_APP_WS_URL=wss://your-backend-url.com
   ```

2. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Navigate to frontend directory
   cd ui
   
   # Deploy
   vercel
   ```

3. **Configure Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Install Command: `npm install`

## Backend Deployment Options

### Option 1: Railway (Recommended)

**Advantages:**
- Easy deployment
- Supports WebSocket connections
- Good for Node.js applications
- Free tier available

**Steps:**
1. Create account at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Set environment variables:
   ```
   MONGODB_URI=your_mongodb_atlas_connection_string
   PORT=5002
   NODE_ENV=production
   ```
4. Deploy the `server` directory

### Option 2: Render

**Advantages:**
- Free tier available
- Good documentation
- Supports WebSocket

**Steps:**
1. Create account at [render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Set environment variables

### Option 3: Heroku

**Advantages:**
- Mature platform
- Good documentation
- Reliable

**Steps:**
1. Create Heroku account
2. Install Heroku CLI
3. Create app: `heroku create your-app-name`
4. Set environment variables:
   ```bash
   heroku config:set MONGODB_URI=your_mongodb_atlas_connection_string
   heroku config:set NODE_ENV=production
   ```
5. Deploy: `git push heroku main`

### Option 4: DigitalOcean App Platform

**Advantages:**
- More control
- Scalable
- Good performance

**Steps:**
1. Create DigitalOcean account
2. Create new App
3. Connect GitHub repository
4. Configure environment variables
5. Deploy

## Environment Variables

### Frontend (Vercel)
```env
REACT_APP_API_URL=https://your-backend-url.com
REACT_APP_WS_URL=wss://your-backend-url.com
```

### Backend
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/socketmetrics
PORT=5002
NODE_ENV=production
```

## MongoDB Atlas Setup

1. Create MongoDB Atlas account
2. Create new cluster
3. Create database user
4. Get connection string
5. Add IP whitelist (0.0.0.0/0 for production)

## Testing Deployment

1. **Frontend**: Visit your Vercel URL
2. **Backend**: Test API endpoints
   ```bash
   curl https://your-backend-url.com/api/metrics/status
   ```
3. **WebSocket**: Check browser console for WebSocket connections

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure backend CORS is configured for your Vercel domain
   - Update CORS origin in backend

2. **WebSocket Connection Failed**
   - Check if backend supports WebSocket
   - Verify WebSocket URL in frontend
   - Check firewall/proxy settings

3. **MongoDB Connection Issues**
   - Verify connection string
   - Check IP whitelist
   - Ensure database user has correct permissions

4. **Environment Variables Not Working**
   - Rebuild frontend after adding environment variables
   - Check variable names (must start with `REACT_APP_` for frontend)
   - Verify backend environment variables are set

### Debug Commands

```bash
# Check backend logs
heroku logs --tail  # (Heroku)
railway logs        # (Railway)

# Test API endpoints
curl -X GET https://your-backend-url.com/api/metrics/status

# Check WebSocket connection
wscat -c wss://your-backend-url.com
```

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to Git
2. **CORS**: Configure properly for production domains
3. **MongoDB**: Use strong passwords and IP restrictions
4. **HTTPS**: Ensure all connections use HTTPS/WSS in production

## Monitoring

1. **Vercel Analytics**: Built-in performance monitoring
2. **Backend Logs**: Monitor application logs
3. **MongoDB Atlas**: Database performance monitoring
4. **Uptime Monitoring**: Set up alerts for downtime

## Cost Estimation

- **Vercel**: Free tier (Hobby plan)
- **Railway**: Free tier available
- **MongoDB Atlas**: Free tier available
- **Total**: $0-20/month for small scale

## Next Steps

1. Deploy backend to your chosen platform
2. Deploy frontend to Vercel
3. Configure environment variables
4. Test all functionality
5. Set up monitoring and alerts
6. Optimize performance if needed 