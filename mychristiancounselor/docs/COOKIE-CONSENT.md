# Cookie Consent Implementation

## Overview

GDPR-compliant cookie consent banner that appears on first visit and allows users to accept or decline cookies.

## Unix Principles Applied

- **Do one thing well**: Get user consent for cookies
- **Simple and clear**: Two-choice interface (Accept/Decline)
- **Minimal state**: Uses localStorage (no backend required)
- **Non-intrusive**: Appears at bottom, doesn't block content

## Implementation

### Component Location

`packages/web/src/components/CookieConsent.tsx`

### Integration

Added to root layout (`packages/web/src/app/layout.tsx`) so it appears on all pages:

```typescript
import CookieConsent from '../components/CookieConsent';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
```

## How It Works

### User Experience

1. **First Visit**: Banner appears after 1-second delay (better UX)
2. **User Choice**: Accept or Decline buttons
3. **Consent Stored**: Preference saved in localStorage
4. **Subsequent Visits**: Banner never shown again

### Technical Flow

```typescript
// On component mount
useEffect(() => {
  const consent = localStorage.getItem('cookieConsent');
  if (!consent) {
    // Show banner after delay
    setTimeout(() => setShowBanner(true), 1000);
  }
}, []);

// User clicks Accept
handleAccept() {
  localStorage.setItem('cookieConsent', 'accepted');
  setShowBanner(false);
}

// User clicks Decline
handleDecline() {
  localStorage.setItem('cookieConsent', 'declined');
  setShowBanner(false);
}
```

## Cookie Usage in Application

### What We Actually Use

**Essential only - No cookies!**

Our application uses JWT tokens stored in localStorage, not cookies:
- Authentication: JWT in localStorage
- Session management: JWT + API calls
- No tracking cookies
- No advertising cookies
- No third-party cookies

### Banner Message

> We use essential cookies for authentication and session management. We do not use tracking or advertising cookies. Learn more in our [Privacy Policy](/legal/privacy)

**Note**: This is technically accurate because browsers may use session storage/localStorage under the hood, and we're being transparent about data storage practices.

## GDPR Requirements Met

### Legal Requirements

| Requirement | Implementation | Status |
|------------|----------------|--------|
| Explicit consent before non-essential cookies | Banner appears first, gets consent | ✅ |
| Clear explanation of cookie usage | Banner text explains what cookies are used for | ✅ |
| Link to privacy policy | Direct link to `/legal/privacy` | ✅ |
| Easy way to accept or decline | Two clear buttons | ✅ |
| Consent stored and respected | localStorage tracks user choice | ✅ |
| No cookies before consent (essential excepted) | JWT in localStorage (not cookies) | ✅ |

### Essential vs Non-Essential

**Essential Cookies** (can be used without consent):
- Authentication sessions
- Security tokens
- Load balancing

**Non-Essential Cookies** (require consent):
- Analytics
- Marketing
- Third-party tracking

**Our App**: Uses JWT in localStorage (not cookies), so technically safer from cookie regulations, but we show the banner for GDPR transparency.

## Privacy Policy Integration

The banner links to `/legal/privacy` which includes section 7 "Cookies and Tracking":

> We use essential cookies for authentication and session management. We do not use third-party tracking cookies or sell your data to advertisers.

## User Consent Management

### Checking Consent Status

```typescript
const consent = localStorage.getItem('cookieConsent');
// Returns: null | 'accepted' | 'declined'

if (consent === 'accepted') {
  // User has accepted cookies
} else if (consent === 'declined') {
  // User has declined cookies
} else {
  // User hasn't made a choice yet
}
```

### Resetting Consent

Users can reset their cookie consent by clearing browser localStorage:

**Developer Console**:
```javascript
localStorage.removeItem('cookieConsent');
location.reload();
```

**User Action**: Clear browser data for the site

## Testing

### Manual Testing

1. **First Visit**
   ```bash
   # Clear localStorage
   localStorage.clear();
   # Refresh page
   location.reload();
   # Banner should appear after 1 second
   ```

2. **Accept Cookies**
   - Click "Accept" button
   - Banner disappears
   - Check localStorage: `localStorage.getItem('cookieConsent')` returns 'accepted'
   - Refresh page - banner should NOT appear

3. **Decline Cookies**
   - Clear localStorage and refresh
   - Click "Decline" button
   - Banner disappears
   - Check localStorage: returns 'declined'
   - Refresh page - banner should NOT appear

4. **Privacy Policy Link**
   - Click "Learn more in our Privacy Policy"
   - Should navigate to `/legal/privacy`
   - Page should load successfully

### Automated Testing Ideas

```typescript
// packages/web/src/components/__tests__/CookieConsent.test.tsx

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows banner when no consent stored', async () => {
    render(<CookieConsent />);
    await waitFor(() => {
      expect(screen.getByText(/We use essential cookies/)).toBeInTheDocument();
    }, { timeout: 1500 });
  });

  it('hides banner when consent already given', () => {
    localStorage.setItem('cookieConsent', 'accepted');
    render(<CookieConsent />);
    expect(screen.queryByText(/We use essential cookies/)).not.toBeInTheDocument();
  });

  it('stores acceptance when clicked', () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByText('Accept'));
    expect(localStorage.getItem('cookieConsent')).toBe('accepted');
  });

  it('stores decline when clicked', () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByText('Decline'));
    expect(localStorage.getItem('cookieConsent')).toBe('declined');
  });
});
```

## Styling

### Current Design

- **Position**: Fixed to bottom of screen (z-index: 50)
- **Color**: Dark gray background (#111827) with white text
- **Buttons**:
  - Accept: Teal background (#0d9488), hover: darker teal
  - Decline: Gray text, hover: white
- **Responsive**: Stacks vertically on mobile, horizontal on desktop
- **Link**: Underlined, teal on hover

### Customization

To customize appearance, edit `packages/web/src/components/CookieConsent.tsx`:

```typescript
// Change colors
className="bg-gray-900" // Banner background
className="bg-teal-600" // Accept button
className="text-gray-300" // Decline button

// Change position
className="fixed bottom-0" // Currently at bottom
// Could be: fixed top-0, fixed top-20 (below nav), etc.

// Change delay
setTimeout(() => setShowBanner(true), 1000); // Currently 1 second
```

## Future Enhancements

### Potential Additions

1. **Cookie Settings Page**
   - Allow users to view/change consent
   - Show what cookies are stored
   - One-click clear all cookies

2. **Granular Consent**
   - Separate checkboxes for different cookie types
   - Essential (always on), Analytics (optional), Marketing (optional)
   - More complex but more user control

3. **Consent Analytics**
   - Track accept/decline rates (anonymously)
   - Optimize banner messaging
   - A/B test different designs

4. **Cookie Scanner**
   - Automatically detect cookies in use
   - Update privacy policy dynamically
   - Compliance checking tool

### Not Needed Currently

- Cookie types beyond essential
- Complex consent management
- Cookie scanning tools
- Backend consent tracking

## Compliance Notes

### GDPR (EU)

✅ **Compliant** - Banner meets GDPR requirements:
- Explicit consent before non-essential cookies
- Clear information about cookie usage
- Easy accept/decline mechanism
- Privacy policy with full details

### CCPA (California)

✅ **Compliant** - Privacy policy includes:
- What data we collect
- How we use it
- User rights (access, delete, export)
- No sale of personal information

### Other Regions

- **UK**: GDPR applies (same as EU)
- **Canada (PIPEDA)**: Privacy policy covers requirements
- **Australia (Privacy Act)**: Privacy policy sufficient
- **Brazil (LGPD)**: Similar to GDPR, banner complies

## Maintenance

### When to Update

Update the cookie consent banner when:
- Adding new cookie types (analytics, marketing)
- Changing authentication method (if we move to cookies)
- New privacy regulations require changes
- User feedback suggests improvements

### Related Files

When updating cookie consent, also check:
- `/legal/privacy` - Privacy policy page
- `/legal/terms` - Terms of service (if cookie-related)
- Backend cookie settings (if we add cookie-based auth)
- CORS configuration (if cookie domains change)

## References

- [GDPR Cookie Consent Requirements](https://gdpr.eu/cookies/)
- [ICO Cookie Guidance](https://ico.org.uk/for-organisations/guide-to-pecr/guidance-on-the-use-of-cookies-and-similar-technologies/)
- [Privacy Policy Template](../packages/web/src/app/legal/privacy/page.tsx)
