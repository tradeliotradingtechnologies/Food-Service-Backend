# Erica's Kitchen — API Documentation

> **Version**: 1.0.0  
> **Base URL**: `http://localhost:3000/api/v1`  
> **Content-Type**: `application/json`  
> **Authentication**: API Key + HTTP-only cookies (JWT)  
> **Payment Provider**: Paystack

---

## Table of Contents

- [Getting Started](#getting-started)
- [API Key (Service-to-Service Auth)](#api-key-service-to-service-auth)
- [Authentication & Tokens](#authentication--tokens)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Paystack Payments](#paystack-payments)
- [API Reference](#api-reference)
  - [Auth](#1-auth)
  - [Categories](#2-categories)
  - [Menu Items](#3-menu-items)
  - [Daily Specials](#4-daily-specials)
  - [Addresses](#5-addresses)
  - [Cart](#6-cart)
  - [Orders](#7-orders)
  - [Payments](#8-payments)
  - [Testimonials](#9-testimonials)
  - [Likes](#10-likes)
  - [Newsletter](#11-newsletter)
  - [Admin](#12-admin)
  - [Analytics](#13-analytics)
  - [Reservations](#14-reservations)
  - [Extra Items & Extra Item Categories](#15-extra-items--extra-item-categories)
- [Enums & Constants](#enums--constants)
- [Data Models](#data-models)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)

---

## Getting Started

### CORS

The API allows requests from the client URL configured on the server (default `http://localhost:3000`). You **must** include credentials in every request so cookies are sent:

```javascript
// Axios
axios.defaults.withCredentials = true;
axios.defaults.baseURL = "http://localhost:3000/api/v1";
axios.defaults.headers.common["X-API-Key"] = "YOUR_API_KEY"; // ← required

// Fetch
fetch("/api/v1/auth/login", {
  method: "POST",
  credentials: "include", // ← required
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "YOUR_API_KEY", // ← required
  },
  body: JSON.stringify({ email, password }),
});
```

---

## API Key (Service-to-Service Auth)

All `/api/*` endpoints require a valid `X-API-Key` header. This is the **first layer of defence** — requests without a valid API key are rejected before JWT auth even runs.

| Header      | Value                                  |
| ----------- | -------------------------------------- |
| `X-API-Key` | The shared secret set in `API_KEY` env |

### How It Works

1. The server stores the API key in the `API_KEY` environment variable (min 32 chars)
2. Every request to `/api/*` must include the `X-API-Key` header
3. The key is compared using **constant-time comparison** (`crypto.timingSafeEqual`) to prevent timing attacks
4. If the key is missing or invalid → `401 Unauthorized`
5. If `API_KEY` is not configured on the server → `500 Server Error` (fail closed)

### Exempt Endpoints

The following endpoints are **exempt** from API key checks because they use their own authentication mechanism:

| Endpoint                                 | Auth Method          |
| ---------------------------------------- | -------------------- |
| `POST /api/v1/payments/webhook/paystack` | Paystack HMAC-SHA512 |

### Generate an API Key

```bash
# Generate a secure 64-character hex key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add it to your `.env`:

```
API_KEY=your_generated_key_here
```

---

## Authentication & Tokens

The API uses **HTTP-only cookies** for token storage — the frontend never handles raw JWTs.

| Cookie         | Lifetime | Sent To                     | Purpose                    |
| -------------- | -------- | --------------------------- | -------------------------- |
| `accessToken`  | 15 min   | All `/api/*` requests       | Authenticates each request |
| `refreshToken` | 7 days   | Only `/api/v1/auth/refresh` | Obtains a new access token |

### Auth Flow

```
1. POST /api/v1/auth/login   → Server sets both cookies automatically
2. All requests            → Browser sends accessToken cookie automatically
3. 401 response            → Call POST /api/v1/auth/refresh to get new tokens
4. POST /api/v1/auth/logout   → Server clears both cookies
```

### Recommended Axios Interceptor

```javascript
// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      await api.post("/auth/refresh"); // refreshes cookies
      return api(original); // retry original request
    }
    return Promise.reject(error);
  },
);
```

### Protected Routes

Routes that say **🔒 Auth** require a logged-in user (valid `accessToken` cookie).

Routes that say **🔐 Permission: `xxx`** additionally require the user's role to have that permission. If the role lacks the permission the API returns `403 Forbidden`.

---

## Response Format

### Success — Single Resource

```json
{
  "status": "success",
  "data": {
    "category": { "_id": "...", "name": "Rice Dishes", ... }
  }
}
```

### Success — Collection

```json
{
  "status": "success",
  "results": 7,
  "data": {
    "categories": [
      { "_id": "...", "name": "Main Dishes", ... },
      ...
    ]
  }
}
```

### Success — Paginated Collection

```json
{
  "status": "success",
  "results": 15,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 57,
      "pages": 3
    }
  }
}
```

### Success — Message Only

```json
{
  "status": "success",
  "message": "Logged in successfully"
}
```

### Success — Message + Data

```json
{
  "status": "success",
  "message": "User signed up successfully",
  "data": { "user": { ... } }
}
```

### Delete — 204 No Content

No response body.

---

## Error Handling

All errors use a consistent envelope:

```json
{
  "status": "fail",
  "message": "A human-readable error message"
}
```

| HTTP Code | Meaning           | Common Causes                                      |
| :-------: | ----------------- | -------------------------------------------------- |
|   `400`   | Bad Request       | Validation error, malformed JSON, invalid ObjectId |
|   `401`   | Unauthorized      | Missing/expired token, wrong password              |
|   `403`   | Forbidden         | Insufficient role permissions                      |
|   `404`   | Not Found         | Resource doesn't exist, wrong ID                   |
|   `409`   | Conflict          | Duplicate email, version conflict                  |
|   `413`   | Payload Too Large | Body exceeds 10KB                                  |
|   `423`   | Locked            | Account locked after too many login attempts       |
|   `429`   | Too Many Requests | Rate limit exceeded                                |
|   `500`   | Server Error      | Unexpected internal error                          |

### Validation Errors (400)

```json
{
  "status": "fail",
  "message": "Validation failed: body.email — Required; body.password — Must be at least 8 characters"
}
```

### Handling in Frontend

```javascript
try {
  const { data } = await api.post("/auth/login", credentials);
  // data.status === "success"
} catch (err) {
  const message = err.response?.data?.message || "Something went wrong";
  // Display `message` to user
}
```

---

## Rate Limiting

| Scope                            | Limit        | Window     |
| -------------------------------- | ------------ | ---------- |
| All endpoints                    | 100 requests | 15 minutes |
| Login / Signup / Forgot Password | 20 requests  | 15 minutes |

When exceeded, the API returns `429 Too Many Requests`.

---

## Paystack Payments

The API integrates with **Paystack** for secure online payments (cards, mobile money). All Paystack-specific security measures are built in.

### Payment Flow

```
1. Frontend:  POST /api/v1/payments/paystack/initialize  { orderId }
2. Server:    Creates payment record, calls Paystack → returns authorizationUrl
3. Frontend:  Redirects user to authorizationUrl (Paystack checkout page)
4. User:      Completes payment on Paystack
5. Paystack:  Redirects back to callbackUrl + sends webhook to server
6. Server:    Webhook verifies signature, updates payment & order status
7. Frontend:  GET /api/v1/payments/paystack/verify/:reference  (optional polling)
```

### Security Measures

| Measure                         | Implementation                                                           |
| ------------------------------- | ------------------------------------------------------------------------ |
| **HMAC Signature Verification** | Every webhook is verified with SHA-512 HMAC using your secret key        |
| **Raw Body Parsing**            | Webhook route uses `express.raw()` to preserve bytes for HMAC check      |
| **API Key Exemption**           | Webhook bypasses API key check (uses its own HMAC auth)                  |
| **Auth Exemption**              | Webhook bypasses JWT auth (server-to-server, not user-initiated)         |
| **Idempotent Processing**       | Duplicate webhook events are handled gracefully (won't double-charge)    |
| **Amount in Pesewas**           | All amounts sent to Paystack are in the smallest currency unit           |
| **Server-side Verification**    | Payment status is always verified server-side, never trusted from client |
| **Fail Closed**                 | Missing Paystack config → requests are rejected                          |

### Webhook Events Handled

| Event              | Action                                     |
| ------------------ | ------------------------------------------ |
| `charge.success`   | Marks payment as successful, order as paid |
| `charge.failed`    | Marks payment as failed                    |
| `refund.processed` | Marks payment as refunded                  |

### Paystack Environment Variables

```
PAYSTACK_SECRET_KEY=sk_test_xxxxx        # Required — your Paystack secret key
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx        # Optional — for frontend reference
PAYSTACK_WEBHOOK_SECRET=xxxxx            # Optional — for additional webhook validation
PAYSTACK_CALLBACK_URL=https://...        # Optional — default redirect after payment
```

> **Never expose `PAYSTACK_SECRET_KEY` to the frontend.** Only the public key should be used client-side.

---

## API Reference

---

### 1. Auth

Base path: `/api/v1/auth`

#### POST `/auth/signup`

Register a new customer account.

| Field             | Type   | Required | Rules                   |
| ----------------- | ------ | :------: | ----------------------- |
| `name`            | string |    ✅    | Min 2 characters        |
| `email`           | string |    ✅    | Valid email, unique     |
| `password`        | string |    ✅    | Min 8 characters        |
| `passwordConfirm` | string |    ✅    | Must match `password`   |
| `phoneNumber`     | string |    —     | Format: `+?[0-9]{7,15}` |

**Response** `201`

```json
{
  "status": "success",
  "message": "User signed up successfully",
  "data": {
    "user": {
      "_id": "...",
      "name": "Abena Customer",
      "email": "abena@gmail.com",
      "authMethod": "local",
      "role": { "_id": "...", "name": "customer" },
      "phoneNumber": "+233201234567",
      "emailVerified": false,
      "active": true,
      "createdAt": "2026-03-03T10:00:00.000Z"
    }
  }
}
```

> Cookies `accessToken` and `refreshToken` are set automatically. A verification email is sent to the user.

---

#### POST `/auth/login`

Authenticate with email and password.

| Field      | Type   | Required |
| ---------- | ------ | :------: |
| `email`    | string |    ✅    |
| `password` | string |    ✅    |

**Response** `200`

```json
{
  "status": "success",
  "message": "Logged in successfully"
}
```

> Cookies are set automatically. After 5 failed attempts the account locks for 30 minutes and a notification email is sent.

---

#### POST `/auth/google`

Authenticate with Google Sign-In.

| Field     | Type   | Required | Description                                |
| --------- | ------ | :------: | ------------------------------------------ |
| `idToken` | string |    ✅    | Google ID token from `google-auth-library` |

**Response** `200` — Same as login. Creates a new user if the Google email is not registered.

---

#### POST `/auth/apple`

Authenticate with Apple Sign-In.

| Field           | Type   | Required | Description                                                                       |
| --------------- | ------ | :------: | --------------------------------------------------------------------------------- |
| `identityToken` | string |    ✅    | Apple identity token                                                              |
| `user`          | object |    —     | `{ name?: { firstName?, lastName? }, email? }` — only sent on first Apple Sign-In |

**Response** `200` — Same as login.

---

#### POST `/auth/refresh`

Refresh the access token using the `refreshToken` cookie.

**Request Body**: None — uses the HTTP-only `refreshToken` cookie.

**Response** `200`

```json
{
  "status": "success",
  "message": "Token refreshed successfully"
}
```

> Both cookies are rotated. Call this when you receive a `401` on any request.

---

#### POST `/auth/logout`

Log out and clear auth cookies.

**Request Body**: None

**Response** `200`

```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

---

#### GET `/auth/verify-email/:token`

Verify email address using the token sent via email.

| Param   | Type   | Description                               |
| ------- | ------ | ----------------------------------------- |
| `token` | string | Verification token from welcome email URL |

**Response** `200`

```json
{
  "status": "success",
  "message": "Email verified successfully"
}
```

---

#### POST `/auth/forgot-password`

Request a password reset email.

| Field   | Type   | Required |
| ------- | ------ | :------: |
| `email` | string |    ✅    |

**Response** `200`

```json
{
  "status": "success",
  "message": "Password reset link sent to email"
}
```

> Always returns 200 even if the email doesn't exist (prevents user enumeration).

---

#### PATCH `/auth/reset-password/:token`

Reset password using the token from the reset email.

| Param   | Type   | Description                |
| ------- | ------ | -------------------------- |
| `token` | string | Reset token from email URL |

| Field             | Type   | Required | Rules                 |
| ----------------- | ------ | :------: | --------------------- |
| `password`        | string |    ✅    | Min 8 characters      |
| `passwordConfirm` | string |    ✅    | Must match `password` |

**Response** `200`

```json
{
  "status": "success",
  "message": "Password reset successfully"
}
```

---

#### GET `/auth/me` 🔒 Auth

Get the current user's profile.

**Response** `200`

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "...",
      "name": "Abena Customer",
      "email": "abena@gmail.com",
      "authMethod": "local",
      "role": { "_id": "...", "name": "customer", "permissions": [...] },
      "phoneNumber": "+233201234567",
      "avatar": null,
      "emailVerified": true,
      "addresses": [...],
      "defaultAddress": "...",
      "active": true,
      "lastLoginAt": "2026-03-03T10:00:00.000Z",
      "createdAt": "2026-02-01T10:00:00.000Z"
    }
  }
}
```

---

#### PATCH `/auth/update-password` 🔒 Auth

Change the current user's password.

| Field                | Type   | Required | Rules                                 |
| -------------------- | ------ | :------: | ------------------------------------- |
| `currentPassword`    | string |    ✅    | Must match current password           |
| `newPassword`        | string |    ✅    | Min 8 chars, must differ from current |
| `newPasswordConfirm` | string |    ✅    | Must match `newPassword`              |

**Response** `200`

```json
{
  "status": "success",
  "message": "Password updated successfully"
}
```

> New tokens are issued automatically (cookies rotated).

---

#### PATCH `/auth/update-profile` 🔒 Auth

Update the current user's profile info.

| Field         | Type   | Required | Rules                   |
| ------------- | ------ | :------: | ----------------------- |
| `name`        | string |    —     | Min 2 characters        |
| `phoneNumber` | string |    —     | Format: `+?[0-9]{7,15}` |
| `avatar`      | string |    —     | Valid URL               |

**Response** `200`

```json
{
  "status": "success",
  "message": "Profile updated successfully",
  "data": {
    "user": { ... }
  }
}
```

---

### 2. Categories

Base path: `/api/v1/categories`

#### GET `/categories`

Get all categories.

**Response** `200`

```json
{
  "status": "success",
  "results": 7,
  "data": {
    "categories": [
      {
        "_id": "...",
        "name": "Main Dishes",
        "slug": "main-dishes",
        "description": "Hearty Ghanaian and African main courses",
        "image": "https://...",
        "isActive": true,
        "sortOrder": 1
      }
    ]
  }
}
```

---

#### GET `/categories/:id`

Get a single category by ID.

**Response** `200` — `{ status, data: { category: { ... } } }`

---

#### GET `/categories/slug/:slug`

Get a single category by slug. Useful for clean URLs.

**Example**: `GET /api/categories/slug/rice-dishes`

**Available slugs**: `main-dishes`, `soups-stews`, `rice-dishes`, `grills-bbq`, `sides`, `beverages`, `desserts`

**Response** `200` — `{ status, data: { category: { ... } } }`

---

#### POST `/categories` 🔐 `category:create`

Create a new category.

| Field         | Type    | Required | Rules               |
| ------------- | ------- | :------: | ------------------- |
| `name`        | string  |    ✅    | 2–100 chars, unique |
| `description` | string  |    —     | Max 500             |
| `image`       | string  |    —     | Valid URL           |
| `isActive`    | boolean |    —     | Default: `true`     |
| `sortOrder`   | integer |    —     | ≥ 0                 |

**Response** `201` — `{ status, data: { category: { ... } } }`

---

#### PATCH `/categories/:id` 🔐 `category:update`

Update a category. All fields optional.

**Response** `200` — `{ status, data: { category: { ... } } }`

---

#### DELETE `/categories/:id` 🔐 `category:delete`

Delete a category.

**Response** `204` — No body.

---

### 3. Menu Items

Base path: `/api/v1/menu-items`

#### GET `/menu-items`

Get menu items with filtering, searching, sorting, and pagination.

| Query Param   | Type    | Default | Description                                                            |
| ------------- | ------- | ------- | ---------------------------------------------------------------------- |
| `category`    | string  | —       | Filter by category ID                                                  |
| `search`      | string  | —       | Text search on name/description                                        |
| `minPrice`    | number  | —       | Minimum price (GHS)                                                    |
| `maxPrice`    | number  | —       | Maximum price (GHS)                                                    |
| `isAvailable` | boolean | —       | Filter by availability                                                 |
| `isFeatured`  | boolean | —       | Filter featured items                                                  |
| `page`        | integer | `1`     | Page number                                                            |
| `limit`       | integer | `20`    | Items per page (max 100)                                               |
| `sort`        | string  | —       | Sort field; prefix `-` for descending (e.g. `-price`, `averageRating`) |

**Example**: `GET /api/menu-items?isFeatured=true&sort=-averageRating&limit=6`

**Response** `200`

```json
{
  "status": "success",
  "results": 6,
  "data": {
    "items": [
      {
        "_id": "...",
        "name": "Jollof Rice",
        "slug": "jollof-rice",
        "description": "Ghana's famous jollof rice...",
        "price": 45.00,
        "currency": "GHS",
        "category": { "_id": "...", "name": "Rice Dishes", "slug": "rice-dishes" },
        "images": ["https://..."],
        "preparationTime": 25,
        "ingredients": ["Rice", "Tomatoes", "Onions", ...],
        "allergens": [],
        "nutritionalInfo": {
          "calories": 550,
          "protein": 25,
          "carbs": 70,
          "fat": 18
        },
        "isAvailable": true,
        "isFeatured": true,
        "likes": 210,
        "averageRating": 4.9,
        "totalReviews": 67,
        "createdAt": "2026-03-03T..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 6,
      "total": 15,
      "pages": 3
    }
  }
}
```

---

#### GET `/menu-items/:id`

Get a single menu item by ID.

**Response** `200` — `{ status, data: { menuItem: { ... } } }`

---

#### GET `/menu-items/slug/:slug`

Get a single menu item by slug.

**Example**: `GET /api/menu-items/slug/jollof-rice`

**Response** `200` — `{ status, data: { menuItem: { ... } } }`

---

#### POST `/menu-items` 🔐 `menu:create`

Create a new menu item.

| Field             | Type     | Required | Rules                                   |
| ----------------- | -------- | :------: | --------------------------------------- |
| `name`            | string   |    ✅    | Max 150                                 |
| `description`     | string   |    ✅    | Max 1000                                |
| `price`           | number   |    ✅    | ≥ 0 (GHS)                               |
| `currency`        | string   |    —     | 3 chars, default `GHS`                  |
| `category`        | string   |    ✅    | Category ObjectId                       |
| `extraItems`      | string[] |    —     | Allowed ExtraItem ObjectIds             |
| `images`          | string[] |    ✅    | Array of URLs, min 1                    |
| `preparationTime` | integer  |    ✅    | ≥ 1 (minutes)                           |
| `ingredients`     | string[] |    —     |                                         |
| `allergens`       | string[] |    —     |                                         |
| `nutritionalInfo` | object   |    —     | `{ calories?, protein?, carbs?, fat? }` |
| `isAvailable`     | boolean  |    —     | Default: `true`                         |
| `isFeatured`      | boolean  |    —     | Default: `false`                        |

**Response** `201` — `{ status, data: { menuItem: { ... } } }`

---

#### PATCH `/menu-items/:id` 🔐 `menu:update`

Update a menu item. All fields optional.

**Response** `200` — `{ status, data: { menuItem: { ... } } }`

---

#### DELETE `/menu-items/:id` 🔐 `menu:delete`

**Response** `204` — No body.

---

### 4. Daily Specials

Base path: `/api/v1/daily-specials`

#### GET `/daily-specials/today`

Get today's active specials. **Use this on the homepage.**

**Response** `200`

```json
{
  "status": "success",
  "results": 1,
  "data": {
    "dailySpecials": [
      {
        "_id": "...",
        "title": "Monday Special — Jollof Feast 🍚",
        "description": "Get our award-winning Jollof Rice at 10% off...",
        "menuItem": { "_id": "...", "name": "Jollof Rice", "price": 45, "images": [...] },
        "date": "2026-03-03T00:00:00.000Z",
        "isActive": true,
        "sortOrder": 1
      }
    ]
  }
}
```

---

#### GET `/daily-specials`

Get all daily specials.

**Response** `200` — Same structure, all dates.

---

#### GET `/daily-specials/:id`

**Response** `200` — `{ status, data: { dailySpecial: { ... } } }`

---

#### POST `/daily-specials` 🔐 `daily_special:create`

| Field         | Type    | Required | Rules                   |
| ------------- | ------- | :------: | ----------------------- |
| `title`       | string  |    ✅    | Max 200                 |
| `description` | string  |    ✅    | Max 1000                |
| `menuItem`    | string  |    ✅    | MenuItem ObjectId       |
| `date`        | string  |    ✅    | ISO date (`YYYY-MM-DD`) |
| `isActive`    | boolean |    —     | Default: `true`         |
| `sortOrder`   | integer |    —     | ≥ 0                     |

**Response** `201`

---

#### PATCH `/daily-specials/:id` 🔐 `daily_special:update`

**Response** `200`

---

#### DELETE `/daily-specials/:id` 🔐 `daily_special:delete`

**Response** `204`

---

### 5. Addresses

Base path: `/api/v1/addresses` — 🔒 All routes require auth

#### GET `/addresses`

Get the current user's saved addresses.

**Response** `200`

```json
{
  "status": "success",
  "results": 2,
  "data": {
    "addresses": [
      {
        "_id": "...",
        "label": "Home",
        "location": "East Legon, Accra",
        "landmark": "Near A&C Mall",
        "gpsAddress": "GA-457-1234",
        "phoneNumber": "+233201234567",
        "isDefault": true
      }
    ]
  }
}
```

---

#### GET `/addresses/:id`

**Response** `200` — `{ status, data: { address: { ... } } }`

---

#### POST `/addresses`

| Field         | Type    | Required | Rules                                        |
| ------------- | ------- | :------: | -------------------------------------------- |
| `label`       | string  |    —     | Max 50 (e.g. "Home", "Office")               |
| `location`    | string  |    ✅    | Max 300                                      |
| `landmark`    | string  |    —     | Max 200                                      |
| `gpsAddress`  | string  |    —     | Ghana Post format: `XX-NNNN-NNNN`            |
| `coordinates` | object  |    —     | `{ type: "Point", coordinates: [lng, lat] }` |
| `phoneNumber` | string  |    ✅    | Valid phone number                           |
| `isDefault`   | boolean |    —     | If `true`, un-defaults other addresses       |

**Response** `201` — `{ status, data: { address: { ... } } }`

---

#### PATCH `/addresses/:id`

All fields optional.

**Response** `200`

---

#### DELETE `/addresses/:id`

**Response** `204`

---

### 6. Cart

Base path: `/api/v1/cart` — 🔒 All routes require auth. Each user has one cart.

#### GET `/cart`

Get the current user's cart with populated menu items.

**Response** `200`

```json
{
  "status": "success",
  "data": {
    "cart": {
      "_id": "...",
      "user": "...",
      "items": [
        {
          "_id": "cartItemId123",
          "menuItem": {
            "_id": "...",
            "name": "Grilled Tilapia",
            "price": 70,
            "images": ["https://..."]
          },
          "quantity": 1,
          "unitPrice": 70.0,
          "selectedExtras": [
            {
              "extraItem": {
                "_id": "...",
                "name": "Extra Pepper Sauce",
                "price": 2.5
              },
              "name": "Extra Pepper Sauce",
              "quantity": 2,
              "unitPrice": 2.5,
              "lineTotal": 5
            }
          ],
          "lineTotal": 75.0,
          "addedAt": "2026-03-03T..."
        }
      ],
      "totalAmount": 75.0
    }
  }
}
```

---

#### POST `/cart/items`

Add an item to the cart with optional extras. If the same menu item with the same extras already exists, its quantity is updated.

| Field            | Type    | Required | Rules                         |
| ---------------- | ------- | :------: | ----------------------------- |
| `menuItem`       | string  |    ✅    | MenuItem ObjectId             |
| `quantity`       | integer |    —     | ≥ 1 (default 1)               |
| `selectedExtras` | array   |    —     | Array of selected extra items |

`selectedExtras` shape:

| Field       | Type    | Required | Rules                                         |
| ----------- | ------- | :------: | --------------------------------------------- |
| `extraItem` | string  |    ✅    | ExtraItem ObjectId allowed for this menu item |
| `quantity`  | integer |    —     | ≥ 1 (default 1)                               |

**Response** `200` — Returns the full updated cart.

---

#### PATCH `/cart/items/:itemId`

Update quantity and/or selected extras for a specific cart line item.

| Param    | Description           |
| -------- | --------------------- |
| `itemId` | The cart item's `_id` |

| Field            | Type    | Required |
| ---------------- | ------- | :------: |
| `quantity`       | integer | ✅ (≥ 1) |
| `selectedExtras` | array   |    —     |

**Response** `200` — Updated cart.

---

#### DELETE `/cart/items/:itemId`

Remove an item from the cart.

| Param    | Description           |
| -------- | --------------------- |
| `itemId` | The cart item's `_id` |

**Response** `200` — Updated cart.

---

#### DELETE `/cart`

Clear the entire cart.

**Response** `200`

---

### 7. Orders

Base path: `/api/v1/orders` — 🔒 All routes require auth

#### POST `/orders`

Create a new order from the user's cart.

> **Address rule**: A saved address is required only when `orderType` is `delivery`.

| Field           | Type   | Required | Rules                                                          |
| --------------- | ------ | :------: | -------------------------------------------------------------- |
| `orderType`     | string |    —     | `delivery` \| `dine_in` \| `takeaway` (defaults to `delivery`) |
| `addressId`     | string |  _see_   | Required when `orderType = delivery`; optional otherwise       |
| `paymentMethod` | string |    ✅    | `mobile_money` \| `card` \| `cash_on_delivery`                 |
| `notes`         | string |    —     | Max 500                                                        |

For `delivery`, **delivery details are auto-generated** from the saved address. You do not supply `location`, `phoneNumber`, etc. in the request body.

For `dine_in` and `takeaway`, the order can be created without any saved address and `deliveryFee` is `0`.

> If the customer later updates that saved address, the new details automatically sync to the customer's own `pending` unpaid orders. Confirmed, paid, delivered, or cancelled orders keep their existing snapshot.

**Response** `201`

```json
{
  "status": "success",
  "data": {
    "order": {
      "_id": "...",
      "orderNumber": "EK-20260303-0005",
      "user": "...",
      "orderType": "delivery",
      "items": [
        {
          "menuItem": "...",
          "name": "Jollof Rice",
          "quantity": 2,
          "unitPrice": 45.0,
          "extraItems": [
            {
              "extraItem": "...",
              "name": "Extra Salad",
              "quantity": 1,
              "unitPrice": 5,
              "lineTotal": 5
            }
          ],
          "lineTotal": 90.0
        }
      ],
      "deliveryAddress": {
        "customerName": "Abena Customer",
        "addressLabel": "Home",
        "location": "East Legon, Accra",
        "landmark": "Near A&C Mall",
        "gpsAddress": "GA-123-4567",
        "phoneNumber": "+233201234567"
      },
      "deliveryFee": 0,
      "subtotal": 90.0,
      "processingFee": 2.5,
      "tax": 0,
      "totalAmount": 92.5,
      "status": "pending",
      "statusHistory": [{ "status": "pending", "changedAt": "2026-03-03T..." }],
      "paymentMethod": "mobile_money",
      "paymentStatus": "pending",
      "createdAt": "2026-03-03T..."
    }
  }
}
```

> The cart is cleared after a successful order.

> `processingFee` is set by the super admin via `PATCH /api/admin/settings/processing-fee`. It can be a flat GHS amount (`"fixed"`) or a percentage of the subtotal (`"percentage"`).

> Other order behavior is also configuration-driven via `PATCH /api/admin/settings/orders`, including `orderingEnabled`, `taxRate`, `deliveryFee`, and `freeDeliveryThreshold`. Payment method availability reflects `PATCH /api/admin/settings/payments` automatically.

---

#### GET `/orders/my`

Get the current user's orders.

| Query    | Type    | Default | Description      |
| -------- | ------- | ------- | ---------------- |
| `status` | string  | —       | Filter by status |
| `page`   | integer | `1`     |                  |
| `limit`  | integer | `20`    | Max 100          |

**Response** `200` — Paginated. `{ data: { orders: [...], pagination: { ... } } }`

---

#### GET `/orders/:id`

Get order details. Customers can only access their own orders.

**Response** `200` — `{ data: { order: { ... } } }`

---

#### POST `/orders/:id/cancel`

Cancel a pending order.

| Field    | Type   | Required | Rules   |
| -------- | ------ | :------: | ------- |
| `reason` | string |    ✅    | Max 500 |

**Response** `200`

> Customers can only cancel orders with `status: "pending"`.

> Orders cannot be cancelled after payment has been made.

---

#### GET `/orders` 🔐 `order:read`

Get all paid orders in the system (admin/staff view).

**Response** `200` — Paginated.

> Unpaid orders do not appear in the admin order listing.

---

#### PATCH `/orders/confirm-all` 🔐 `order:update`

Confirm all currently pending orders in one request.

| Field  | Type   | Required | Rules   |
| ------ | ------ | :------: | ------- |
| `note` | string |    —     | Max 300 |

**Response** `200`

```json
{
  "status": "success",
  "results": 12,
  "data": {
    "confirmedCount": 12,
    "orders": [{ "_id": "...", "status": "confirmed" }]
  }
}
```

---

#### PATCH `/orders/:id/refresh-address` 🔐 `order:update`

Refresh a pending unpaid order's delivery snapshot from the customer's saved address.

| Field       | Type   | Required | Rules                                                  |
| ----------- | ------ | :------: | ------------------------------------------------------ |
| `addressId` | string |    —     | Specific saved address to use. Omit for default/recent |

**Response** `200`

> This endpoint is intended for staff/admin use before confirmation. It only works for `delivery` orders that are still `pending` and unpaid.

---

#### PATCH `/orders/:id/status` 🔐 `order:update`

Update an order's status.

| Field    | Type   | Required | Rules                 |
| -------- | ------ | :------: | --------------------- |
| `status` | string |    ✅    | See status flow below |
| `note`   | string |    —     | Max 300               |

**Order Status Flow**:

```
pending → confirmed → preparing → ready_for_pickup → out_for_delivery → delivered
  ↘ cancelled (before payment only)
```

**Response** `200`

---

#### PATCH `/orders/:id/assign-rider` 🔐 `order:update`

Assign a delivery rider to an order.

| Field     | Type   |              Required              |
| --------- | ------ | :--------------------------------: |
| `riderId` | string | ✅ (User ObjectId with rider role) |

**Response** `200`

---

#### PATCH `/orders/:id/capture-coordinates` 🔐 `order:update`

Capture live delivery coordinates for an order. Uses browser geolocation API and reverse geocodes to get area name via OpenStreetMap's Nominatim service.

| Field       | Type   | Required | Rules                                 |
| ----------- | ------ | :------: | ------------------------------------- |
| `latitude`  | number |    ✅    | Between -90 and 90                    |
| `longitude` | number |    ✅    | Between -180 and 180                  |
| `accuracy`  | number |    —     | GPS accuracy in meters (if available) |

**Response** `200`

```json
{
  "status": "success",
  "message": "Delivery coordinates captured",
  "data": {
    "order": {
      "_id": "...",
      "orderNumber": "EK-20260303-0005",
      "deliveryCoordinates": {
        "latitude": 5.603717,
        "longitude": -0.186964,
        "accuracy": 10,
        "capturedAt": "2026-03-03T10:30:00.000Z"
      },
      "areaName": "East Legon",
      "liveLocationUpdatedAt": "2026-03-03T10:30:00.000Z"
    }
  }
}
```

> Only available for orders in early stages: `pending`, `confirmed`, `preparing`, or `ready_for_pickup`.

> Automatically performs reverse geocoding to extract area/neighborhood name using free OpenStreetMap Nominatim service.

---

#### PATCH `/orders/:id/update-location` 🔒 Auth (Customer only)

Update delivery location for pending orders. Allows customers to update their exact delivery spot before dispatch.

| Field       | Type   | Required | Rules                                 |
| ----------- | ------ | :------: | ------------------------------------- |
| `latitude`  | number |    ✅    | Between -90 and 90                    |
| `longitude` | number |    ✅    | Between -180 and 180                  |
| `accuracy`  | number |    —     | GPS accuracy in meters (if available) |

**Response** `200`

```json
{
  "status": "success",
  "message": "Delivery location updated",
  "data": { "order": { ... } }
}
```

> Only works for orders before dispatch (`pending`, `confirmed`, `preparing`, `ready_for_pickup`) and only for unpaid orders.

> Customer can only update their own orders.

---

#### GET `/orders/delivery/:id` 🔐 `delivery:read`

Get order details with delivery coordinates for assigned rider.

**Response** `200`

```json
{
  "status": "success",
  "data": {
    "order": {
      "_id": "...",
      "orderNumber": "EK-20260303-0005",
      "user": { "name": "Customer Name", "phoneNumber": "+233..." },
      "items": [{ "name": "Jollof Rice", ... }],
      "deliveryAddress": { ... },
      "deliveryCoordinates": {
        "latitude": 5.603717,
        "longitude": -0.186964,
        "accuracy": 10,
        "capturedAt": "2026-03-03T10:30:00.000Z"
      },
      "areaName": "East Legon",
      "status": "out_for_delivery"
    }
  }
}
```

> Rider can only access orders assigned to them.

---

#### GET `/orders/dispatch-board` 🔐 `order:read`

Get all paid orders with live coordinates for dispatch management and map tracking.

| Query    | Type    | Default | Description      |
| -------- | ------- | ------- | ---------------- |
| `status` | string  | —       | Filter by status |
| `page`   | integer | `1`     |                  |
| `limit`  | integer | `20`    | Max 100          |

**Response** `200` — Paginated list of orders with delivery coordinates.

```json
{
  "status": "success",
  "results": 5,
  "data": {
    "orders": [
      {
        "_id": "...",
        "orderNumber": "EK-20260303-0005",
        "user": { "name": "Customer", "phoneNumber": "+233..." },
        "deliveryAddress": { "location": "East Legon, Accra" },
        "deliveryCoordinates": {
          "latitude": 5.603717,
          "longitude": -0.186964,
          "capturedAt": "2026-03-03T10:30:00.000Z"
        },
        "areaName": "East Legon",
        "status": "out_for_delivery",
        "assignedRider": { "name": "Rider Name", "phoneNumber": "+233..." },
        "createdAt": "2026-03-03T09:15:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 5, "pages": 1 }
  }
}
```

> Only returns paid orders that have delivery coordinates captured.

> Used for real-time tracking dashboards with map integration.

---

### 8. Payments

Base path: `/api/v1/payments`

#### POST `/payments/paystack/initialize` 🔒 Auth

Initialize a Paystack payment. Returns a checkout URL to redirect the user to.

> Availability is controlled by `PATCH /api/admin/settings/payments`. If `paystackEnabled` is `false` or card payments are disabled, this endpoint returns an error immediately.

| Field         | Type   | Required | Rules                            |
| ------------- | ------ | :------: | -------------------------------- |
| `orderId`     | string |    ✅    | Order ObjectId                   |
| `callbackUrl` | string |    —     | URL to redirect to after payment |

**Response** `200`

```json
{
  "status": "success",
  "data": {
    "payment": {
      "_id": "...",
      "order": "...",
      "amount": 100.0,
      "currency": "GHS",
      "method": "card",
      "provider": "paystack",
      "providerRef": "EK-orderId-1234567890",
      "status": "pending",
      "createdAt": "2026-03-03T..."
    },
    "authorizationUrl": "https://checkout.paystack.com/xxxxx",
    "accessCode": "xxxxx",
    "reference": "EK-orderId-1234567890"
  }
}
```

> Redirect the user to `authorizationUrl` to complete payment.

---

#### GET `/payments/paystack/verify/:reference` 🔒 Auth

Verify a Paystack payment after redirect. Use this as a fallback if the webhook hasn't processed yet.

| Param       | Type   | Description                    |
| ----------- | ------ | ------------------------------ |
| `reference` | string | Paystack transaction reference |

**Response** `200` — `{ data: { payment: { ... } } }`

---

#### POST `/payments/webhook/paystack`

Paystack webhook endpoint. **No API key or JWT required** — authenticated via HMAC-SHA512 signature.

> This endpoint is called by Paystack servers. Do not call it from your frontend.

| Header                 | Description                          |
| ---------------------- | ------------------------------------ |
| `x-paystack-signature` | HMAC-SHA512 hash of the request body |

**Response** `200` — Always returns `200` to acknowledge receipt.

---

#### POST `/payments` 🔒 Auth

Initiate a generic (non-Paystack) payment for an order.

> Allowed methods come from `PATCH /api/admin/settings/payments` and apply immediately.

| Field      | Type   | Required | Rules                                          |
| ---------- | ------ | :------: | ---------------------------------------------- |
| `orderId`  | string |    ✅    | Order ObjectId                                 |
| `method`   | string |    ✅    | `mobile_money` \| `card` \| `cash_on_delivery` |
| `provider` | string |    —     | e.g. `MTN MoMo`                                |

**Response** `201`

```json
{
  "status": "success",
  "data": {
    "payment": {
      "_id": "...",
      "order": "...",
      "amount": 100.0,
      "currency": "GHS",
      "method": "mobile_money",
      "provider": "MTN MoMo",
      "status": "initiated",
      "createdAt": "2026-03-03T..."
    }
  }
}
```

---

#### GET `/payments/my` 🔒 Auth

Get the current user's payment history.

**Response** `200` — `{ data: { payments: [...] } }`

---

#### GET `/payments/order/:orderId` 🔒 Auth

Get payment for a specific order.

**Response** `200` — `{ data: { payment: { ... } } }`

---

#### PATCH `/payments/:id/confirm` 🔐 `payment:update`

Confirm a payment (admin marks payment as successful).

| Field         | Type   |              Required               |
| ------------- | ------ | :---------------------------------: |
| `providerRef` | string | ✅ (external transaction reference) |
| `metadata`    | object |                  —                  |

**Response** `200`

---

#### PATCH `/payments/:id/fail` 🔐 `payment:update`

Mark a payment as failed.

**Response** `200`

---

#### POST `/payments/:id/refund` 🔐 `payment:update`

Refund a payment. For Paystack payments, the refund is initiated via the Paystack API. For other payments, the status is updated locally.

| Field    | Type   | Required | Rules                              |
| -------- | ------ | :------: | ---------------------------------- |
| `amount` | number |    —     | Min 0.01 (defaults to full amount) |
| `reason` | string |    —     | Max 500                            |

**Response** `200`

---

### 9. Testimonials

Base path: `/api/v1/testimonials`

#### GET `/testimonials/approved`

Get all approved testimonials (public, for display on the website).

**Response** `200` — `{ results, data: { testimonials: [...] } }`

---

#### GET `/testimonials/featured`

Get featured testimonials (public, for homepage).

**Response** `200` — `{ results, data: { testimonials: [...] } }`

```json
{
  "status": "success",
  "results": 3,
  "data": {
    "testimonials": [
      {
        "_id": "...",
        "user": { "_id": "...", "name": "Abena Customer", "avatar": null },
        "content": "The Jollof Rice here is absolutely incredible!...",
        "rating": 5,
        "menuItem": { "_id": "...", "name": "Jollof Rice" },
        "isApproved": true,
        "isFeatured": true,
        "createdAt": "2026-03-03T..."
      }
    ]
  }
}
```

---

#### POST `/testimonials` 🔒 Auth

Create a testimonial (pending approval).

| Field      | Type    | Required | Rules              |
| ---------- | ------- | :------: | ------------------ |
| `content`  | string  |    ✅    | Max 500 characters |
| `rating`   | integer |    ✅    | 1–5                |
| `menuItem` | string  |    —     | MenuItem ObjectId  |

**Response** `201`

---

#### GET `/testimonials/my` 🔒 Auth

Get the current user's testimonials.

**Response** `200`

---

#### PATCH `/testimonials/:id` 🔒 Auth

Update own testimonial.

| Field     | Type    |  Required   |
| --------- | ------- | :---------: |
| `content` | string  | — (max 500) |
| `rating`  | integer |   — (1–5)   |

**Response** `200`

---

#### DELETE `/testimonials/:id` 🔒 Auth

Delete own testimonial.

**Response** `204`

---

#### GET `/testimonials` 🔐 `testimonial:read`

Get all testimonials including unapproved (admin view).

**Response** `200`

---

#### PATCH `/testimonials/:id/moderate` 🔐 `testimonial:update`

Approve/feature a testimonial.

| Field        | Type    | Required |
| ------------ | ------- | :------: |
| `isApproved` | boolean |    —     |
| `isFeatured` | boolean |    —     |

**Response** `200`

---

### 10. Likes

Base path: `/api/v1/likes` — 🔒 All routes require auth

#### GET `/likes`

Get all menu items the current user has liked.

**Response** `200`

```json
{
  "status": "success",
  "results": 3,
  "data": {
    "likes": [
      {
        "_id": "...",
        "menuItem": { "_id": "...", "name": "Jollof Rice", "price": 45, "images": [...] },
        "createdAt": "2026-03-03T..."
      }
    ]
  }
}
```

---

#### POST `/likes/:menuItemId`

Toggle like on a menu item. Like → unlike → like.

**Response** `200`

```json
{
  "status": "success",
  "message": "Menu item liked" // or "Menu item unliked"
}
```

> The `likes` count on the menu item is updated automatically.

---

#### GET `/likes/:menuItemId/status`

Check if the current user has liked a specific menu item.

**Response** `200`

```json
{
  "status": "success",
  "data": { "liked": true }
}
```

---

### 11. Newsletter

Base path: `/api/v1/newsletter`

#### POST `/newsletter/subscribe`

Subscribe an email to the newsletter.

| Field   | Type   |     Required     |
| ------- | ------ | :--------------: |
| `email` | string | ✅ (valid email) |

**Response** `201`

```json
{
  "status": "success",
  "message": "Successfully subscribed to newsletter"
}
```

---

#### POST `/newsletter/unsubscribe`

| Field   | Type   | Required |
| ------- | ------ | :------: |
| `email` | string |    ✅    |

**Response** `200`

```json
{
  "status": "success",
  "message": "Successfully unsubscribed from newsletter"
}
```

---

#### GET `/newsletter` 🔐 `newsletter:read`

Get all subscribers (admin).

**Response** `200` — `{ data: { subscribers: [...] } }`

---

#### GET `/newsletter/count` 🔐 `newsletter:read`

Get subscriber count.

**Response** `200`

```json
{
  "status": "success",
  "data": { "count": 6 }
}
```

---

### 12. Admin

Base path: `/api/v1/admin` — 🔒 All routes require auth

#### GET `/admin/profile`

Get admin's own profile.

**Response** `200` — `{ data: { user: { ... } } }`

---

#### PATCH `/admin/profile`

Update admin's own profile.

**Response** `200`

---

#### GET `/admin/profile/providers`

Get linked OAuth providers for the admin's account.

**Response** `200` — `{ data: { providers: [...] } }`

---

#### GET `/admin/users` 🔐 `user:read`

List all users with filters and pagination.

| Query    | Type    | Default | Description             |
| -------- | ------- | ------- | ----------------------- |
| `role`   | string  | —       | Filter by role ID       |
| `active` | boolean | —       | Filter active/inactive  |
| `search` | string  | —       | Search by name or email |
| `page`   | integer | `1`     |                         |
| `limit`  | integer | `20`    | Max 100                 |

**Response** `200`

```json
{
  "status": "success",
  "results": 7,
  "data": {
    "users": [
      {
        "_id": "...",
        "name": "Abena Customer",
        "email": "abena@gmail.com",
        "role": { "_id": "...", "name": "customer" },
        "active": true,
        "emailVerified": true,
        "lastLoginAt": "2026-03-03T...",
        "createdAt": "2026-02-01T..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 7,
      "pages": 1
    }
  }
}
```

---

#### GET `/admin/users/:id` 🔐 `user:read`

Get full user profile.

**Response** `200` — `{ data: { user: { ... } } }`

---

#### PATCH `/admin/users/:id` 🔐 `user:update`

Update a user's account.

| Field           | Type    | Required | Description         |
| --------------- | ------- | :------: | ------------------- |
| `name`          | string  |    —     | Min 2 chars         |
| `email`         | string  |    —     | Valid email         |
| `phoneNumber`   | string  |    —     | Valid phone         |
| `role`          | string  |    —     | Role ObjectId       |
| `active`        | boolean |    —     | Activate/deactivate |
| `emailVerified` | boolean |    —     |                     |

**Response** `200`

---

#### DELETE `/admin/users/:id` 🔐 `user:delete`

**Response** `204`

---

#### GET `/admin/roles` 🔐 `setting:read`

List all roles with their permissions.

**Response** `200`

```json
{
  "status": "success",
  "results": 5,
  "data": {
    "roles": [
      {
        "_id": "...",
        "name": "admin",
        "description": "Full access except system configuration",
        "permissions": [
          {
            "_id": "...",
            "name": "category:create",
            "resource": "category",
            "action": "create"
          }
        ],
        "isDefault": false
      }
    ]
  }
}
```

---

#### GET `/admin/roles/:id` 🔐 `setting:read`

**Response** `200` — `{ data: { role: { ... } } }`

---

#### PATCH `/admin/roles/:id/permissions` 🔐 `setting:update`

Update a role's permissions.

| Field         | Type     |              Required              |
| ------------- | -------- | :--------------------------------: |
| `permissions` | string[] | ✅ (Array of Permission ObjectIds) |

**Response** `200`

---

#### GET `/admin/permissions` 🔐 `setting:read`

List all available permissions.

**Response** `200` — `{ data: { permissions: [...] } }`

---

#### GET `/admin/audit-logs` 🔐 `audit_log:read`

Get system audit logs.

**Response** `200`

```json
{
  "status": "success",
  "data": {
    "logs": [
      {
        "_id": "...",
        "actor": { "_id": "...", "name": "Abena Customer" },
        "action": "order.create",
        "resource": "order",
        "resourceId": "...",
        "status": "success",
        "createdAt": "2026-03-01T..."
      }
    ]
  }
}
```

---

#### GET `/admin/settings` 🔐 `setting:read`

Get all live application configuration sections.

**Response** `200` — `{ data: { settings: { orders, reservations, payments } } }`

---

#### GET `/admin/settings/:key` 🔐 `setting:read`

Get a single configuration section.

| Param | Allowed Values                       |
| ----- | ------------------------------------ |
| `key` | `orders`, `reservations`, `payments` |

**Response** `200`

---

#### PATCH `/admin/settings/orders` 🔐 `super_admin` only

Update order settings. Changes apply immediately to new orders.

Configurable fields include `orderingEnabled`, `processingFee`, `taxRate`, `deliveryFee`, and `freeDeliveryThreshold`.

---

#### PATCH `/admin/settings/reservations` 🔐 `super_admin` only

Update reservation settings. Changes apply immediately to reservation creation and updates.

Configurable fields include `reservationsEnabled`, `minPartySize`, `maxPartySize`, `minAdvanceHours`, `maxAdvanceDays`, `openingTime`, and `closingTime`.

---

#### PATCH `/admin/settings/payments` 🔐 `super_admin` only

Update payment settings. Changes apply immediately to payment initiation and refunds.

Configurable fields include `currency`, `enabledMethods`, `paystackEnabled`, `allowManualConfirmation`, and `refundWindowDays`.

---

#### GET `/admin/settings/processing-fee` 🔐 `super_admin` only

Get the current processing fee configuration.

**Response** `200`

```json
{
  "status": "success",
  "data": {
    "processingFee": {
      "type": "fixed",
      "amount": 2.5
    }
  }
}
```

---

#### PATCH `/admin/settings/processing-fee` 🔐 `super_admin` only

Update the processing fee applied to every new order. Only the `super_admin` role can access this endpoint.

| Field    | Type   | Required | Rules                               |
| -------- | ------ | :------: | ----------------------------------- |
| `type`   | string |    ✅    | `fixed` \| `percentage`             |
| `amount` | number |    ✅    | `>= 0`. Fixed = GHS. Percentage = % |

Examples:

```json
// Flat GHS 2.50 fee
{ "type": "fixed", "amount": 2.50 }

// 1.5% of subtotal
{ "type": "percentage", "amount": 1.5 }
```

**Response** `200`

```json
{
  "status": "success",
  "message": "Processing fee updated successfully",
  "data": {
    "processingFee": { "type": "fixed", "amount": 2.5 }
  }
}
```

---

### 13. Analytics

Base path: `/api/v1/analytics` — 🔐 All routes require `report:read` permission

#### GET `/analytics/dashboard`

Get the main dashboard KPIs.

**Response** `200`

```json
{
  "status": "success",
  "data": {
    "overview": {
      "totalSales": 503.0,
      "ordersToday": 2,
      "reservationsToday": 1,
      "customerReviews": {
        "average": 4.6,
        "total": 5
      }
    },
    "restaurantStatistics": {
      "monthlySales": 503.0,
      "totalOrders": 4,
      "reservations": 4,
      "newCustomers": 3
    }
  }
}
```

---

#### GET `/analytics/revenue-chart`

Monthly revenue data for charts.

| Query   | Type    | Default      |
| ------- | ------- | ------------ |
| `year`  | integer | Current year |
| `month` | integer | — (1–12)     |

**Response** `200` — Revenue data points for chart rendering.

---

#### GET `/analytics/sales`

| Query    | Type   | Values                                 |
| -------- | ------ | -------------------------------------- |
| `period` | string | `today` \| `week` \| `month` \| `year` |

**Response** `200`

---

#### GET `/analytics/orders`

Order analytics and trends.

| Query    | Type   | Values                                 |
| -------- | ------ | -------------------------------------- |
| `period` | string | `today` \| `week` \| `month` \| `year` |

**Response** `200`

---

#### GET `/analytics/customers`

Customer growth and engagement.

| Query    | Type   | Values                      |
| -------- | ------ | --------------------------- |
| `period` | string | `week` \| `month` \| `year` |

**Response** `200`

---

#### GET `/analytics/menu-performance`

Top-performing menu items.

| Query    | Type    | Default                               |
| -------- | ------- | ------------------------------------- |
| `period` | string  | `month` (`week` \| `month` \| `year`) |
| `limit`  | integer | `20` (1–100)                          |

**Response** `200`

---

#### GET `/analytics/recent-activity`

Recent system activity feed.

**Response** `200`

---

#### GET `/analytics/reservations`

Reservation analytics.

| Query    | Type   | Values                       |
| -------- | ------ | ---------------------------- |
| `period` | string | `today` \| `week` \| `month` |

**Response** `200`

---

### 14. Reservations

Base path: `/api/v1/reservations`

#### POST `/reservations`

Create a new reservation. **No auth required** — guests can make reservations.

> Reservation rules are configuration-driven via `PATCH /api/admin/settings/reservations` and apply immediately.

| Field             | Type    | Required | Rules                                   |
| ----------------- | ------- | :------: | --------------------------------------- |
| `guestName`       | string  |    ✅    | Max 100                                 |
| `guestEmail`      | string  |    —     | Valid email                             |
| `guestPhone`      | string  |    ✅    | Valid phone                             |
| `date`            | string  |    ✅    | ISO date, must be future (`2026-03-10`) |
| `time`            | string  |    ✅    | `HH:MM` format (`19:30`)                |
| `partySize`       | integer |    ✅    | Based on configured min/max party size  |
| `specialRequests` | string  |    —     | Max 500                                 |

**Response** `201`

```json
{
  "status": "success",
  "data": {
    "reservation": {
      "_id": "...",
      "reservationNumber": "RES-20260303-0005",
      "guestName": "Kofi Testing",
      "guestEmail": "kofi@gmail.com",
      "guestPhone": "+233241234567",
      "date": "2026-03-10T00:00:00.000Z",
      "time": "19:30",
      "partySize": 4,
      "status": "pending",
      "specialRequests": "Outdoor seating please",
      "createdAt": "2026-03-03T..."
    }
  }
}
```

> If the user is logged in, the reservation is linked to their account.

---

#### GET `/reservations/my` 🔒 Auth

Get the current user's reservations.

**Response** `200` — `{ results, data: { reservations: [...] } }`

---

#### POST `/reservations/:id/cancel` 🔒 Auth

Cancel own reservation.

| Field    | Type   |  Required   |
| -------- | ------ | :---------: |
| `reason` | string | — (max 500) |

**Response** `200`

---

#### GET `/reservations` 🔐 `reservation:read`

Get all reservations with filtering and pagination.

| Query    | Type    | Default        |
| -------- | ------- | -------------- |
| `status` | string  | —              |
| `date`   | string  | — (ISO date)   |
| `page`   | integer | `1`            |
| `limit`  | integer | `20` (max 100) |

**Response** `200` — Paginated. `{ data: { reservations: [...], total, page, totalPages } }`

---

#### GET `/reservations/upcoming` 🔐 `reservation:read`

Get upcoming confirmed/pending reservations.

**Response** `200`

---

#### GET `/reservations/:id` 🔐 `reservation:read`

**Response** `200` — `{ data: { reservation: { ... } } }`

---

#### PATCH `/reservations/:id` 🔐 `reservation:update`

Update reservation details.

| Field             | Type    | Required |
| ----------------- | ------- | :------: |
| `guestName`       | string  |    —     |
| `guestEmail`      | string  |    —     |
| `guestPhone`      | string  |    —     |
| `date`            | string  |    —     |
| `time`            | string  |    —     |
| `partySize`       | integer | — (1–50) |
| `tableNumber`     | integer | — (≥ 1)  |
| `specialRequests` | string  |    —     |

**Response** `200`

---

#### PATCH `/reservations/:id/status` 🔐 `reservation:update`

Update reservation status.

| Field                | Type   | Required | Rules                           |
| -------------------- | ------ | :------: | ------------------------------- |
| `status`             | string |    ✅    | See flow below                  |
| `cancellationReason` | string |    —     | Max 500, for `cancelled` status |

**Reservation Status Flow**:

```
pending → confirmed → seated → completed
    ↘ cancelled        ↘ no_show
```

**Response** `200`

---

#### DELETE `/reservations/:id` 🔐 `reservation:delete`

**Response** `204`

---

### 15. Extra Items & Extra Item Categories

These endpoints support menu add-ons. Customers can read/select them, but only super admin, admin, and staff can create/update/delete.

#### Extra Item Categories

Base path: `/api/v1/extra-items-categories`

#### GET `/extra-items-categories`

Public list of extra item categories.

**Response** `200` — `{ status, results, data: { categories: [...] } }`

#### GET `/extra-items-categories/:id`

Public category details with virtual `items` populated.

**Response** `200`

#### POST `/extra-items-categories` 🔒 Role: `super_admin` \| `admin` \| `staff`

| Field  | Type   | Required | Rules       |
| ------ | ------ | :------: | ----------- |
| `name` | string |    ✅    | 2-100 chars |

**Response** `201`

#### PATCH `/extra-items-categories/:id` 🔒 Role: `super_admin` \| `admin` \| `staff`

| Field  | Type   | Required |
| ------ | ------ | :------: |
| `name` | string |    —     |

**Response** `200`

#### DELETE `/extra-items-categories/:id` 🔒 Role: `super_admin` \| `admin` \| `staff`

**Response** `204`

#### Extra Items

Base path: `/api/v1/extra-items`

#### GET `/extra-items`

Public list of extra items.

| Query      | Type   | Required | Description                      |
| ---------- | ------ | :------: | -------------------------------- |
| `category` | string |    —     | Filter by extra item category ID |

**Response** `200` — `{ status, results, data: { items: [...] } }`

#### GET `/extra-items/:id`

Public extra item details.

**Response** `200`

#### POST `/extra-items` 🔒 Role: `super_admin` \| `admin` \| `staff`

| Field         | Type   | Required | Rules                        |
| ------------- | ------ | :------: | ---------------------------- |
| `name`        | string |    ✅    | 2-120 chars                  |
| `price`       | number |    ✅    | >= 0                         |
| `description` | string |    —     | <= 300 chars                 |
| `category`    | string |    ✅    | Extra item category ObjectId |

**Response** `201`

#### PATCH `/extra-items/:id` 🔒 Role: `super_admin` \| `admin` \| `staff`

All fields optional.

**Response** `200`

#### DELETE `/extra-items/:id` 🔒 Role: `super_admin` \| `admin` \| `staff`

**Response** `204`

---

## Enums & Constants

### Order Statuses

```typescript
"pending" |
  "confirmed" |
  "preparing" |
  "ready_for_pickup" |
  "out_for_delivery" |
  "delivered" |
  "cancelled";
```

### Reservation Statuses

```typescript
"pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
```

### Payment Methods

```typescript
"mobile_money" | "card" | "cash_on_delivery";
```

### Order Types

```typescript
"delivery" | "dine_in" | "takeaway";
```

### Payment Statuses

```typescript
"initiated" | "pending" | "success" | "failed" | "refunded";
```

### Auth Methods

```typescript
"local" | "google" | "apple";
```

### Currency

```typescript
"GHS"; // Ghana Cedis — all prices in GHS
```

---

## Data Models

### User

```typescript
{
  _id: string;
  name: string;
  email: string;
  authMethod: "local" | "google" | "apple";
  role: Role;                    // populated
  avatar?: string;
  phoneNumber?: string;
  addresses: Address[];          // populated
  defaultAddress?: string;       // Address ID
  emailVerified: boolean;
  active: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Category

```typescript
{
  _id: string;
  name: string;
  slug: string;                  // auto-generated from name
  description?: string;
  image?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}
```

### MenuItem

```typescript
{
  _id: string;
  name: string;
  slug: string;                  // auto-generated from name
  description: string;
  price: number;                 // in GHS
  currency: string;              // "GHS"
  category: Category;            // populated
  images: string[];
  preparationTime: number;       // in minutes
  ingredients: string[];
  allergens: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  isAvailable: boolean;
  isFeatured: boolean;
  likes: number;
  averageRating: number;
  totalReviews: number;
  createdAt: string;
}
```

### Order

```typescript
{
  _id: string;
  orderNumber: string;           // "EK-YYYYMMDD-XXXX"
  user: string;
  orderType: "delivery" | "dine_in" | "takeaway";
  items: {
    menuItem: string;
    name: string;                // snapshot
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  deliveryAddress?: {
    sourceAddressId?: string;    // link to saved address used for snapshot sync
    customerName: string;        // auto-populated from user profile
    addressLabel?: string;       // e.g. "Home", "Office"
    location: string;
    landmark?: string;
    gpsAddress?: string;         // Ghana Post GPS: GA-XXX-XXXX
    phoneNumber: string;
  };
  deliveryFee: number;
  subtotal: number;
  processingFee: number;         // set by super admin via PATCH /admin/settings/processing-fee
  tax: number;
  totalAmount: number;           // subtotal + deliveryFee + processingFee + tax
  status: OrderStatus;
  statusHistory: {
    status: string;
    changedBy?: string;
    changedAt: string;
    note?: string;
  }[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  assignedRider?: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  notes?: string;
  cancellationReason?: string;
  deliveryCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;           // GPS accuracy radius in meters
    capturedAt: string;
  };
  areaName?: string;             // reverse-geocoded area from OpenStreetMap/Nominatim
  liveLocationUpdatedAt?: string;
  createdAt: string;
}
```

### Payment

```typescript
{
  _id: string;
  order: string;
  user: string;
  amount: number;
  currency: string;              // "GHS"
  method: PaymentMethod;
  provider?: string;             // "MTN MoMo", "Paystack"
  providerRef?: string;
  status: PaymentStatus;
  paidAt?: string;
  refundedAt?: string;
  refundAmount?: number;
  createdAt: string;
}
```

### Reservation

```typescript
{
  _id: string;
  reservationNumber: string;     // "RES-YYYYMMDD-XXXX"
  user?: string;
  guestName: string;
  guestEmail?: string;
  guestPhone: string;
  date: string;                  // ISO date
  time: string;                  // "HH:MM"
  partySize: number;
  tableNumber?: number;
  status: ReservationStatus;
  specialRequests?: string;
  confirmedBy?: string;
  createdAt: string;
}
```

### Testimonial

```typescript
{
  _id: string;
  user: {                        // populated
    _id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  rating: number;                // 1–5
  menuItem?: {                   // populated
    _id: string;
    name: string;
  };
  isApproved: boolean;
  isFeatured: boolean;
  createdAt: string;
}
```

### Address

```typescript
{
  _id: string;
  user: string;
  label?: string;                // "Home", "Office"
  location: string;
  landmark?: string;
  gpsAddress?: string;           // "GA-457-1234"
  coordinates?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  phoneNumber: string;
  isDefault: boolean;
}
```

### Cart

```typescript
{
  _id: string;
  user: string;
  items: {
    menuItem: MenuItem; // populated
    quantity: number;
    unitPrice: number;
    addedAt: string;
  }
  [];
  totalAmount: number; // auto-calculated
}
```

---

## Quick Reference — All Endpoints

| Method | Path                             | Auth | Permission             |
| :----: | -------------------------------- | :--: | ---------------------- |
|  POST  | `/auth/signup`                   |  —   | —                      |
|  POST  | `/auth/login`                    |  —   | —                      |
|  POST  | `/auth/google`                   |  —   | —                      |
|  POST  | `/auth/apple`                    |  —   | —                      |
|  POST  | `/auth/refresh`                  |  —   | —                      |
|  POST  | `/auth/logout`                   |  —   | —                      |
|  GET   | `/auth/verify-email/:token`      |  —   | —                      |
|  POST  | `/auth/forgot-password`          |  —   | —                      |
| PATCH  | `/auth/reset-password/:token`    |  —   | —                      |
|  GET   | `/auth/me`                       |  🔒  | —                      |
| PATCH  | `/auth/update-password`          |  🔒  | —                      |
| PATCH  | `/auth/update-profile`           |  🔒  | —                      |
|        |                                  |      |                        |
|  GET   | `/categories`                    |  —   | —                      |
|  GET   | `/categories/:id`                |  —   | —                      |
|  GET   | `/categories/slug/:slug`         |  —   | —                      |
|  POST  | `/categories`                    |  🔒  | `category:create`      |
| PATCH  | `/categories/:id`                |  🔒  | `category:update`      |
| DELETE | `/categories/:id`                |  🔒  | `category:delete`      |
|        |                                  |      |                        |
|  GET   | `/menu-items`                    |  —   | —                      |
|  GET   | `/menu-items/:id`                |  —   | —                      |
|  GET   | `/menu-items/slug/:slug`         |  —   | —                      |
|  POST  | `/menu-items`                    |  🔒  | `menu:create`          |
| PATCH  | `/menu-items/:id`                |  🔒  | `menu:update`          |
| DELETE | `/menu-items/:id`                |  🔒  | `menu:delete`          |
|        |                                  |      |                        |
|  GET   | `/daily-specials/today`          |  —   | —                      |
|  GET   | `/daily-specials`                |  —   | —                      |
|  GET   | `/daily-specials/:id`            |  —   | —                      |
|  POST  | `/daily-specials`                |  🔒  | `daily_special:create` |
| PATCH  | `/daily-specials/:id`            |  🔒  | `daily_special:update` |
| DELETE | `/daily-specials/:id`            |  🔒  | `daily_special:delete` |
|        |                                  |      |                        |
|  GET   | `/addresses`                     |  🔒  | —                      |
|  GET   | `/addresses/:id`                 |  🔒  | —                      |
|  POST  | `/addresses`                     |  🔒  | —                      |
| PATCH  | `/addresses/:id`                 |  🔒  | —                      |
| DELETE | `/addresses/:id`                 |  🔒  | —                      |
|        |                                  |      |                        |
|  GET   | `/cart`                          |  🔒  | —                      |
|  POST  | `/cart/items`                    |  🔒  | —                      |
| PATCH  | `/cart/items/:itemId`            |  🔒  | —                      |
| DELETE | `/cart/items/:itemId`            |  🔒  | —                      |
| DELETE | `/cart`                          |  🔒  | —                      |
|        |                                  |      |                        |
|  GET   | `/extra-items-categories`        |  —   | —                      |
|  GET   | `/extra-items-categories/:id`    |  —   | —                      |
|  POST  | `/extra-items-categories`        |  🔒  | Role: admin/staff      |
| PATCH  | `/extra-items-categories/:id`    |  🔒  | Role: admin/staff      |
| DELETE | `/extra-items-categories/:id`    |  🔒  | Role: admin/staff      |
|  GET   | `/extra-items`                   |  —   | —                      |
|  GET   | `/extra-items/:id`               |  —   | —                      |
|  POST  | `/extra-items`                   |  🔒  | Role: admin/staff      |
| PATCH  | `/extra-items/:id`               |  🔒  | Role: admin/staff      |
| DELETE | `/extra-items/:id`               |  🔒  | Role: admin/staff      |
|        |                                  |      |                        |
|  POST  | `/orders`                        |  🔒  | —                      |
|  GET   | `/orders/my`                     |  🔒  | —                      |
|  GET   | `/orders/:id`                    |  🔒  | —                      |
|  POST  | `/orders/:id/cancel`             |  🔒  | —                      |
|  GET   | `/orders`                        |  🔒  | `order:read`           |
| PATCH  | `/orders/confirm-all`            |  🔒  | `order:update`         |
| PATCH  | `/orders/:id/refresh-address`    |  🔒  | `order:update`         |
| PATCH  | `/orders/:id/status`             |  🔒  | `order:update`         |
| PATCH  | `/orders/:id/assign-rider`       |  🔒  | `order:update`         |
|        |                                  |      |                        |
|  POST  | `/payments/paystack/initialize`  |  🔒  | —                      |
|  GET   | `/payments/paystack/verify/:ref` |  🔒  | —                      |
|  POST  | `/payments/webhook/paystack`     |  —   | HMAC signature         |
|  POST  | `/payments`                      |  🔒  | —                      |
|  GET   | `/payments/my`                   |  🔒  | —                      |
|  GET   | `/payments/order/:orderId`       |  🔒  | —                      |
| PATCH  | `/payments/:id/confirm`          |  🔒  | `payment:update`       |
| PATCH  | `/payments/:id/fail`             |  🔒  | `payment:update`       |
|  POST  | `/payments/:id/refund`           |  🔒  | `payment:update`       |
|        |                                  |      |                        |
|  GET   | `/testimonials/approved`         |  —   | —                      |
|  GET   | `/testimonials/featured`         |  —   | —                      |
|  POST  | `/testimonials`                  |  🔒  | —                      |
|  GET   | `/testimonials/my`               |  🔒  | —                      |
| PATCH  | `/testimonials/:id`              |  🔒  | —                      |
| DELETE | `/testimonials/:id`              |  🔒  | —                      |
|  GET   | `/testimonials`                  |  🔒  | `testimonial:read`     |
| PATCH  | `/testimonials/:id/moderate`     |  🔒  | `testimonial:update`   |
|        |                                  |      |                        |
|  GET   | `/likes`                         |  🔒  | —                      |
|  POST  | `/likes/:menuItemId`             |  🔒  | —                      |
|  GET   | `/likes/:menuItemId/status`      |  🔒  | —                      |
|        |                                  |      |                        |
|  POST  | `/newsletter/subscribe`          |  —   | —                      |
|  POST  | `/newsletter/unsubscribe`        |  —   | —                      |
|  GET   | `/newsletter`                    |  🔒  | `newsletter:read`      |
|  GET   | `/newsletter/count`              |  🔒  | `newsletter:read`      |
|        |                                  |      |                        |
|  GET   | `/admin/profile`                 |  🔒  | —                      |
| PATCH  | `/admin/profile`                 |  🔒  | —                      |
|  GET   | `/admin/profile/providers`       |  🔒  | —                      |
|  GET   | `/admin/users`                   |  🔒  | `user:read`            |
|  GET   | `/admin/users/:id`               |  🔒  | `user:read`            |
| PATCH  | `/admin/users/:id`               |  🔒  | `user:update`          |
| DELETE | `/admin/users/:id`               |  🔒  | `user:delete`          |
|  GET   | `/admin/roles`                   |  🔒  | `setting:read`         |
|  GET   | `/admin/roles/:id`               |  🔒  | `setting:read`         |
| PATCH  | `/admin/roles/:id/permissions`   |  🔒  | `setting:update`       |
|  GET   | `/admin/permissions`             |  🔒  | `setting:read`         |
|  GET   | `/admin/audit-logs`              |  🔒  | `audit_log:read`       |
|  GET   | `/admin/settings/processing-fee` |  🔒  | `super_admin` only     |
| PATCH  | `/admin/settings/processing-fee` |  🔒  | `super_admin` only     |
|        |                                  |      |                        |
|  GET   | `/analytics/dashboard`           |  🔒  | `report:read`          |
|  GET   | `/analytics/revenue-chart`       |  🔒  | `report:read`          |
|  GET   | `/analytics/sales`               |  🔒  | `report:read`          |
|  GET   | `/analytics/orders`              |  🔒  | `report:read`          |
|  GET   | `/analytics/customers`           |  🔒  | `report:read`          |
|  GET   | `/analytics/menu-performance`    |  🔒  | `report:read`          |
|  GET   | `/analytics/recent-activity`     |  🔒  | `report:read`          |
|  GET   | `/analytics/reservations`        |  🔒  | `report:read`          |
|        |                                  |      |                        |
|  POST  | `/reservations`                  |  —   | —                      |
|  GET   | `/reservations/my`               |  🔒  | —                      |
|  POST  | `/reservations/:id/cancel`       |  🔒  | —                      |
|  GET   | `/reservations`                  |  🔒  | `reservation:read`     |
|  GET   | `/reservations/upcoming`         |  🔒  | `reservation:read`     |
|  GET   | `/reservations/:id`              |  🔒  | `reservation:read`     |
| PATCH  | `/reservations/:id`              |  🔒  | `reservation:update`   |
| PATCH  | `/reservations/:id/status`       |  🔒  | `reservation:update`   |
| DELETE | `/reservations/:id`              |  🔒  | `reservation:delete`   |

---

## Deployment

### Pre-deploy checklist

1. Copy `.env.example` to `.env` and set production secrets
2. Set `NODE_ENV=production`
3. Set `RUN_SEEDERS_ON_BOOT=false` (recommended for production)
4. Set `CLIENT_URL` to allowed frontend origins (comma-separated)
5. Set required third-party credentials (MongoDB, SMTP, Paystack, Cloudinary as needed)

### Build validation

```bash
npm ci
npm run predeploy
```

### Start with PM2

```bash
npm run start:pm2
pm2 save
```

### Start with Docker

```bash
docker build -t ericas-kitchen-backend .
docker run --env-file .env -p 3000:3000 --name ericas-kitchen-api ericas-kitchen-backend
```

The API exposes `GET /health` for load balancer and container health checks.

---

## Environment Variables

Create a `.env` file in the project root. All required variables must be set for the server to start.

| Variable                  | Required | Default       | Description                                                             |
| ------------------------- | :------: | ------------- | ----------------------------------------------------------------------- |
| `NODE_ENV`                |    —     | `development` | `development` \| `production` \| `test`                                 |
| `PORT`                    |    —     | `3000`        | Server port                                                             |
| `RUN_SEEDERS_ON_BOOT`     |    —     | `auto`        | `auto` \| `true` \| `false`                                             |
| `DB_URI`                  |    ✅    | —             | MongoDB connection string                                               |
| `JWT_SECRET`              |    ✅    | —             | Min 32 chars — signs access tokens                                      |
| `JWT_REFRESH_SECRET`      |    ✅    | —             | Min 32 chars — signs refresh tokens                                     |
| `JWT_ACCESS_EXPIRES_IN`   |    —     | `15m`         | Access token TTL                                                        |
| `JWT_REFRESH_EXPIRES_IN`  |    —     | `7d`          | Refresh token TTL                                                       |
| `BCRYPT_SALT_ROUNDS`      |    —     | `12`          | Bcrypt cost factor                                                      |
| `API_KEY`                 |    ✅    | —             | Min 32 chars — `X-API-Key` header value                                 |
| `CLIENT_URL`              |    —     | —             | Allowed CORS origin(s), comma-separated (first is used for email links) |
| `GOOGLE_CLIENT_ID`        |    —     | —             | Google OAuth client ID                                                  |
| `APPLE_CLIENT_ID`         |    —     | —             | Apple Sign-In client ID                                                 |
| `PAYSTACK_SECRET_KEY`     |   —\*    | —             | Paystack secret key (`sk_test_...` / `sk_live_...`)                     |
| `PAYSTACK_PUBLIC_KEY`     |    —     | —             | Paystack public key (frontend reference only)                           |
| `PAYSTACK_WEBHOOK_SECRET` |    —     | —             | Additional webhook validation secret                                    |
| `PAYSTACK_CALLBACK_URL`   |    —     | —             | Default redirect URL after Paystack payment                             |
| `CLOUDINARY_CLOUD_NAME`   |    —     | —             | Cloudinary cloud name                                                   |
| `CLOUDINARY_API_KEY`      |    —     | —             | Cloudinary API key                                                      |
| `CLOUDINARY_API_SECRET`   |    —     | —             | Cloudinary API secret                                                   |
| `SMTP_HOST`               |    —     | —             | SMTP server host                                                        |
| `SMTP_PORT`               |    —     | —             | SMTP server port                                                        |
| `SMTP_SECURE`             |    —     | —             | Use TLS (`true`/`false`)                                                |
| `SMTP_USER`               |    —     | —             | SMTP username                                                           |
| `SMTP_PASS`               |    —     | —             | SMTP password                                                           |
| `EMAIL_FROM`              |    —     | —             | Sender email address                                                    |
| `EMAIL_REPLY_TO`          |    —     | —             | Reply-to email address                                                  |

> \* `PAYSTACK_SECRET_KEY` is required if you want Paystack payments to work.

---

---

## Promo Code Endpoints

**Base path:** `/api/v1/admin/settings/promo-codes` (super_admin only)

| Method | Path                                   | Description             |
| ------ | -------------------------------------- | ----------------------- |
| POST   | `/settings/promo-codes`                | Create a new promo code |
| GET    | `/settings/promo-codes`                | List/search promo codes |
| GET    | `/settings/promo-codes/:id`            | Get promo code by ID    |
| PATCH  | `/settings/promo-codes/:id`            | Update promo code       |
| PATCH  | `/settings/promo-codes/:id/invalidate` | Invalidate a promo code |
| DELETE | `/settings/promo-codes/:id`            | Delete a promo code     |

**Promo Code Object Example:**

```json
{
  "_id": "...",
  "code": "WELCOME10",
  "discountType": "percent", // or "fixed"
  "discountValue": 10,
  "maxRedemptions": 100,
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "isActive": true,
  "createdAt": "2026-03-25T10:00:00.000Z"
}
```

---

## Commission Endpoints

**Base path:** `/api/v1/admin/settings/commission` (super_admin only)

| Method | Path                         | Description                    |
| ------ | ---------------------------- | ------------------------------ |
| GET    | `/settings/commission`       | Get commission settings        |
| PATCH  | `/settings/commission`       | Update commission settings     |
| GET    | `/settings/commission/today` | Get today's commission summary |

**Commission Settings Example:**

```json
{
  "type": "percent", // or "fixed"
  "value": 5 // percent or fixed amount
}
```

**Today's Commission Example:**

```json
{
  "date": "2026-03-25",
  "totalCommission": 120.5,
  "ordersCount": 15
}
```

---

_Erica's Kitchen API v1.0.0 — Last updated March 2026_
