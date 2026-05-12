# Diabetic Diet AI Coach – Backend API Summary

## Overview
Complete Node.js backend API for the Diabetic Diet AI Coach Flutter application with all features implemented.

## Features Implemented

### ✅ Authentication & User Management
- User registration (with optional password for guest users)
- User login with JWT tokens
- Guest user support
- Token verification
- Complete user profile management (personal info, body metrics, health conditions, diet preferences)
- Settings management
- Account deletion

### ✅ Meal Plans
- Automatic 7-day meal plan generation
- Personalized based on user profile (height, weight, activity level, health conditions)
- Calorie and macro calculation (BMR + TDEE)
- Meal plan retrieval and updates
- Support for multiple meal plans

### ✅ Symptom Tracking
- Log symptoms (Blood Sugar, Energy, Digestion, Mood, Sleep Quality)
- Get symptom history with filtering
- Trend analysis for charts (7-day, 14-day, etc.)
- Recent logs retrieval
- Delete symptom entries

### ✅ Reminders
- Create reminders (medication, health checks, meals)
- Get all reminders
- Update reminders
- Toggle enabled/disabled
- Delete reminders
- Support for recurring reminders

### ✅ Doctor Search
- Search doctors by name, specialty
- Filter by specialty, location, availability
- Get doctor details
- Sample doctor seeding endpoint
- Full-text search support

### ✅ AI Chat Companion
- Send messages and get AI responses
- Rule-based intelligent responses
- Context-aware based on user health conditions
- Chat history management
- Confidence scoring

### ✅ Push Notifications
- Device token registration
- Send push notifications (Firebase Cloud Messaging)
- Manage device tokens
- Support for multiple devices per user

## API Base URL
```
http://localhost:5000/api
```

## Authentication
Most endpoints require JWT authentication. Include token in header:
```
Authorization: Bearer <jwt-token>
```

## Key Endpoints

### Authentication
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/guest` - Guest login
- `GET /api/auth/verify` - Verify token

### User Profile
- `GET /api/users/profile` - Get profile
- `PUT /api/users/profile/personal` - Update personal info
- `PUT /api/users/profile/body` - Update body info
- `PUT /api/users/profile/health` - Update health conditions
- `PUT /api/users/profile/diet` - Update diet preferences

### Meal Plans
- `POST /api/meal-plans/generate` - Generate 7-day plan
- `GET /api/meal-plans/current` - Get current plan
- `GET /api/meal-plans` - Get all plans

### Symptoms
- `POST /api/symptoms/log` - Log symptom
- `GET /api/symptoms/logs` - Get logs
- `GET /api/symptoms/trends` - Get trends for charts

### Reminders
- `POST /api/reminders` - Create reminder
- `GET /api/reminders` - Get all reminders
- `PUT /api/reminders/:id` - Update reminder

### Doctors
- `GET /api/doctors` - Get doctors (with filters)
- `GET /api/doctors/search/:query` - Search doctors
- `POST /api/doctors/seed` - Seed sample data

### Chat
- `POST /api/chat/message` - Send message
- `GET /api/chat/history` - Get history

### Notifications
- `POST /api/notifications/register-token` - Register FCM token
- `POST /api/notifications/send` - Send notification

## Database Models

1. **User** - Complete user profile with all settings
2. **MealPlan** - 7-day meal plans with daily meals
3. **SymptomLog** - Symptom tracking entries
4. **Reminder** - Medication and health reminders
5. **Doctor** - Healthcare provider information
6. **ChatMessage** - AI chat conversation history

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Push Notifications**: Firebase Admin SDK (optional)

## File Structure

```
backend/
├── models/              # MongoDB schemas
│   ├── User.js
│   ├── MealPlan.js
│   ├── SymptomLog.js
│   ├── Reminder.js
│   ├── Doctor.js
│   └── ChatMessage.js
├── routes/              # API route handlers
│   ├── auth.js
│   ├── users.js
│   ├── mealPlans.js
│   ├── symptoms.js
│   ├── reminders.js
│   ├── doctors.js
│   ├── chat.js
│   └── notifications.js
├── middleware/          # Middleware functions
│   └── auth.js
├── server.js            # Main server file
├── package.json         # Dependencies
├── README.md            # Full documentation
├── SETUP.md             # Quick setup guide
└── .env                 # Environment variables (create this)
```

## Next Steps

1. **Install dependencies**: `npm install`
2. **Configure environment**: Create `.env` file (see SETUP.md)
3. **Start MongoDB**: Local or MongoDB Atlas
4. **Run server**: `npm run dev`
5. **Test endpoints**: Use Postman or curl
6. **Connect Flutter app**: Update API base URL in Flutter constants

## Notes

- All endpoints return JSON responses
- Error responses follow consistent format: `{ success: false, message: "..." }`
- Success responses: `{ success: true, ... }`
- Authentication middleware protects most routes
- Guest users can use some endpoints without authentication

## Production Considerations

1. Use strong JWT_SECRET
2. Enable HTTPS
3. Configure CORS properly
4. Set up MongoDB Atlas or secure MongoDB
5. Use environment variables for all secrets
6. Set up Firebase Admin SDK for push notifications
7. Add rate limiting
8. Add request validation
9. Set up logging
10. Use PM2 or similar for process management
