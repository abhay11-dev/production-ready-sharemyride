# Backend Setup Guide - Admin Dashboard & Blog Endpoints

## Admin Analytics Endpoint
**Route**: `GET /api/admin/analytics/summary`
**Purpose**: Fetch platform metrics for admin overview
**Response Format**:
```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "activeUsers": 320,
    "totalRides": 8945,
    "totalRevenue": 234500,
    "avgRating": 4.75,
    "cities": 12
  }
}
```

## Admin Users Endpoint
**Route**: `GET /api/admin/users`
**Purpose**: Fetch list of all users for management
**Response Format**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "userId",
      "name": "User Name",
      "email": "user@example.com",
      "phone": "+91-XXXXXX",
      "createdAt": "2026-01-15",
      "isVerified": true,
      "totalRides": 45
    }
  ]
}
```

## Admin Rides Endpoint
**Route**: `GET /api/admin/rides`
**Purpose**: Fetch ride statistics for tracking
**Response Format**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "rideId",
      "start": "Delhi",
      "end": "Gurgaon",
      "date": "2026-01-15",
      "status": "completed",
      "driver": "Driver Name",
      "passengers": 3,
      "fare": 450
    }
  ]
}
```

## Admin Enquiries Management
**Route**: `GET /api/admin/enquiries`
**Purpose**: Fetch all user enquiries
**Response Format**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "enquiryId",
      "name": "User Name",
      "email": "user@example.com",
      "subject": "General Inquiry",
      "message": "Question about platform",
      "status": "pending",
      "createdAt": "2026-01-15T10:30:00Z"
    }
  ]
}
```

**Route**: `PUT /api/admin/enquiries/:id`
**Purpose**: Update enquiry status
**Request Body**:
```json
{
  "status": "resolved"
}
```

## Admin Reports Management
**Route**: `GET /api/admin/reports`
**Purpose**: Fetch all issue reports
**Response Format**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "reportId",
      "subject": "Technical Bug",
      "email": "user@example.com",
      "message": "App crashes when...",
      "severity": "critical",
      "status": "open",
      "type": "report_technical",
      "createdAt": "2026-01-15T10:30:00Z"
    }
  ]
}
```

**Route**: `PUT /api/admin/reports/:id`
**Purpose**: Update report status
**Request Body**:
```json
{
  "status": "resolved"
}
```

## Admin Blogs Management
**Route**: `GET /api/admin/blogs`
**Purpose**: Fetch all blogs for moderation
**Response Format**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "blogId",
      "title": "Blog Title",
      "author": "Author Name",
      "content": "Blog content...",
      "status": "published",
      "likes": 42,
      "comments": 8,
      "shares": 3,
      "createdAt": "2026-01-15T10:30:00Z"
    }
  ]
}
```

## Blog System Endpoints

### Get All Blogs
**Route**: `GET /api/blogs`
**Purpose**: Fetch all published blogs for frontend display
**Query Parameters**:
- `sort`: "newest" | "trending" | "rating" (default: "newest")
- `limit`: number (default: 10)
- `skip`: number (default: 0)

**Response Format**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "blogId",
      "title": "Journey to Pune",
      "author": {
        "_id": "userId",
        "name": "John Doe",
        "avatar": "url"
      },
      "content": "Blog content...",
      "excerpt": "Short summary...",
      "coverImage": "url",
      "likes": 42,
      "comments": 8,
      "shares": 3,
      "rating": 4.5,
      "createdAt": "2026-01-15T10:30:00Z"
    }
  ]
}
```

### Get Single Blog
**Route**: `GET /api/blogs/:id`
**Purpose**: Fetch detailed blog view with all comments and replies
**Response Format**:
```json
{
  "success": true,
  "data": {
    "_id": "blogId",
    "title": "Journey to Pune",
    "author": { "name": "John Doe", "avatar": "url" },
    "content": "Full blog content...",
    "likes": 42,
    "comments": [
      {
        "_id": "commentId",
        "author": { "name": "Jane Smith" },
        "text": "Great post!",
        "likes": 5,
        "replies": [
          {
            "_id": "replyId",
            "author": { "name": "John Doe" },
            "text": "Thanks for reading!",
            "likes": 2
          }
        ],
        "createdAt": "2026-01-15T11:00:00Z"
      }
    ]
  }
}
```

### Create Blog
**Route**: `POST /api/blogs`
**Auth**: Required (JWT)
**Request Body**:
```json
{
  "title": "My Travel Story",
  "content": "Full blog content...",
  "excerpt": "Short summary",
  "coverImage": "image-url",
  "tags": ["travel", "delhi"]
}
```

### Like Blog
**Route**: `POST /api/blogs/:id/like`
**Auth**: Required
**Response**: `{ "success": true, "likes": 43 }`

### Share Blog
**Route**: `POST /api/blogs/:id/share`
**Auth**: Required
**Request Body**: 
```json
{
  "platform": "whatsapp" | "facebook" | "twitter"
}
```

### Add Comment
**Route**: `POST /api/blogs/:id/comments`
**Auth**: Required
**Request Body**:
```json
{
  "text": "Great article!"
}
```

**Response**:
```json
{
  "success": true,
  "comment": {
    "_id": "commentId",
    "author": { "name": "User", "avatar": "url" },
    "text": "Great article!",
    "likes": 0,
    "replies": [],
    "createdAt": "2026-01-15T11:00:00Z"
  }
}
```

### Add Reply to Comment
**Route**: `POST /api/blogs/:id/comments/:commentId/replies`
**Auth**: Required
**Request Body**:
```json
{
  "text": "Thanks for the comment!"
}
```

### Like Comment
**Route**: `POST /api/blogs/:id/comments/:commentId/like`
**Auth**: Required
**Response**: `{ "success": true, "likes": 6 }`

## Implementation Notes

### Frontend Integration Points
1. **AdminDashboard.jsx**: Uses all `/api/admin/*` endpoints
2. **Blog.jsx**: Uses `/api/blogs` endpoints
3. **ProtectedRoute**: Requires authentication for POST operations

### Backend Model Extensions Needed
- **Blog Model**: Add nested comments with replies support
  ```javascript
  comments: [{
    author: ObjectId,
    text: String,
    likes: [ObjectId],
    replies: [{
      author: ObjectId,
      text: String,
      likes: [ObjectId],
      createdAt: Date
    }],
    createdAt: Date
  }]
  ```

### Database Queries Needed
- Efficiently fetch blogs with comment count
- Aggregate likes/shares/ratings
- Nested comment population with author details
- Pagination for large result sets

### Email Integration
- Notify admin when new enquiry submitted
- Notify admin when critical issue reported
- Send user confirmation after enquiry submitted
- Send notification when blog comment receives reply

---

## Testing Checklist
- [ ] Admin can view all analytics metrics
- [ ] Admin can search and filter enquiries
- [ ] Admin can update enquiry status
- [ ] Admin can view and resolve issue reports
- [ ] Admin can view and manage blogs
- [ ] Users can create blogs
- [ ] Users can like/share blogs
- [ ] Users can comment on blogs with nested replies
- [ ] Comments show author info correctly
- [ ] Like counts update in real-time
- [ ] Replies display under parent comment
- [ ] Email sent to admin on enquiry submission
- [ ] Email sent to admin on issue report
