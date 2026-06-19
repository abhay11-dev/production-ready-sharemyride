# Email Configuration Guide

## ⚙️ Setup Instructions

### 1. Environment Variables
Add to your `.env` file:

```env
# Admin notifications
ADMIN_EMAIL=admin@sharemyride.com

# Email service (already configured)
RESEND_API_KEY=your_resend_key_here
SENDER_EMAIL=noreply@sharemyride.com
```

### 2. Email Templates

Create these files in `backend/templates/`:

#### `inquiry-notification.html`
```html
<h2>New Inquiry Received</h2>
<p><strong>From:</strong> {{senderName}} ({{senderEmail}})</p>
<p><strong>Subject:</strong> {{inquirySubject}}</p>
<p><strong>Message:</strong></p>
<p>{{inquiryMessage}}</p>
<p><a href="{{adminUrl}}/inquiries">View in Admin Panel</a></p>
```

#### `report-alert.html`
```html
<h2>Urgent Report - {{severity}} Priority</h2>
<p><strong>Title:</strong> {{reportTitle}}</p>
<p><strong>Description:</strong> {{reportDescription}}</p>
<p><strong>Reported By:</strong> {{reporterName}}</p>
<p><a href="{{adminUrl}}/reports">View in Admin Panel</a></p>
```

#### `blog-moderation.html`
```html
<h2>Blog Awaiting Moderation</h2>
<p><strong>Title:</strong> {{blogTitle}}</p>
<p><strong>Author:</strong> {{authorName}}</p>
<p><strong>Status:</strong> Pending Review</p>
<p><a href="{{adminUrl}}/blogs">Review in Admin Panel</a></p>
```

### 3. Update Email Service

Update `backend/services/emailService.js`:

```javascript
const sendAdminNotification = async (type, data) => {
  const templates = {
    inquiry: {
      subject: 'New Inquiry Received',
      template: 'inquiry-notification',
    },
    report: {
      subject: `Critical Report - ${data.severity} Priority`,
      template: 'report-alert',
    },
    blog: {
      subject: 'Blog Awaiting Moderation',
      template: 'blog-moderation',
    },
  };

  const { subject, template } = templates[type];
  const html = await loadTemplate(template, data);

  return await resendClient.emails.send({
    from: process.env.SENDER_EMAIL,
    to: process.env.ADMIN_EMAIL,
    subject,
    html,
  });
};
```

### 4. Integration Points

#### In inquiryController.js
```javascript
await emailService.sendAdminNotification('inquiry', {
  senderName: inquiry.name,
  senderEmail: inquiry.email,
  inquirySubject: inquiry.subject,
  inquiryMessage: inquiry.message,
});
```

#### In rideController.js (for reports)
```javascript
if (report.severity === 'critical' || report.severity === 'high') {
  await emailService.sendAdminNotification('report', {
    reportTitle: report.title,
    reportDescription: report.description,
    reporterName: reporter.name,
    severity: report.severity,
  });
}
```

#### In blogController.js (for moderation)
```javascript
if (blog.status === 'pending') {
  await emailService.sendAdminNotification('blog', {
    blogTitle: blog.title,
    authorName: blog.author.name,
  });
}
```

### 5. Testing

```bash
# Test in development
npm test -- --testPathPattern=emailService

# Manual test via curl
curl -X POST http://localhost:5000/api/inquiries \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "subject": "Test Inquiry",
    "message": "This is a test"
  }'
```

---

## 🔧 Configuration Checklist

- [ ] Set `ADMIN_EMAIL` in `.env`
- [ ] Create `templates/` directory
- [ ] Add all 3 HTML email templates
- [ ] Update `emailService.js` with sendAdminNotification function
- [ ] Update controllers with email triggers
- [ ] Test with development email
- [ ] Verify in Resend dashboard
- [ ] Deploy to production with correct ADMIN_EMAIL

---

## 📧 Email Flow Diagram

```
User Action
    ↓
Controllers
    ↓
emailService.sendAdminNotification()
    ↓
Load Template & Insert Data
    ↓
Resend API
    ↓
ADMIN_EMAIL Inbox
    ↓
Admin Panel Link
```

---

## ⚠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| Emails not sent | Verify `ADMIN_EMAIL` and `RESEND_API_KEY` in `.env` |
| Template not found | Check file path and template name match |
| Variables not replacing | Ensure data object keys match template {{variables}} |
| Marked as spam | Check email domain reputation, add SPF/DKIM records |

---

**Status**: Ready for implementation
**Effort**: 30 minutes
**Impact**: Operational notifications for admin panel
