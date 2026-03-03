# Erica's Kitchen — API Documentation

> **Version**: 1.0.0  
> **Base URL**: `http://localhost:3000/api`  
> **Content-Type**: `application/json`  
> **Authentication**: HTTP-only cookies (JWT)
---

## Table of Contents

- [Getting Started](#getting-started)
- [Authentication & Tokens](#authentication--tokens)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
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
- [Enums & Constants](#enums--constants)
- [Data Models](#data-models)

---

## Getting Started

### CORS

The API allows requests from the client URL configured on the server (default `http://localhost:3000`). You **must** include credentials in every request so cookies are sent:

```javascript
// Axios
axios.defaults.withCredentials = true;
axios.defaults.baseURL = "http://localhost:3000/api";

// Fetch
fetch("/api/auth/login", {
  method: "POST",
  credentials: "include", // ← required
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
```

---

## Authentication & Tokens

The API uses **HTTP-only cookies** for token storage — the frontend never handles raw JWTs.

| Cookie         | Lifetime | Sent To                  | Purpose                    |
| -------------- | -------- | ------------------------ | -------------------------- |
| `accessToken`  | 15 min   | All `/api/*` requests    | Authenticates each request |
| `refreshToken` | 7 days   | Only `/api/auth/refresh` | Obtains a new access token |

### Auth Flow

```
1. POST /api/auth/login   → Server sets both cookies automatically
2. All requests            → Browser sends accessToken cookie automatically
3. 401 response            → Call POST /api/auth/refresh to get new tokens
4. POST /api/auth/logout   → Server clears both cookies
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

## API Reference

---

### 1. Auth

Base path: `/api/auth`

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

Base path: `/api/categories`

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

Base path: `/api/menu-items`

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

Base path: `/api/daily-specials`

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

Base path: `/api/addresses` — 🔒 All routes require auth

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

Base path: `/api/cart` — 🔒 All routes require auth. Each user has one cart.

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
          "menuItem": {
            "_id": "...",
            "name": "Grilled Tilapia",
            "price": 70,
            "images": ["https://..."]
          },
          "quantity": 1,
          "unitPrice": 70.0,
          "addedAt": "2026-03-03T..."
        }
      ],
      "totalAmount": 70.0
    }
  }
}
```

---

#### POST `/cart/items`

Add an item to the cart. If the item already exists, its quantity is updated.

| Field      | Type    | Required | Rules             |
| ---------- | ------- | :------: | ----------------- |
| `menuItem` | string  |    ✅    | MenuItem ObjectId |
| `quantity` | integer |    —     | ≥ 1 (default 1)   |

**Response** `200` — Returns the full updated cart.

---

#### PATCH `/cart/items/:menuItemId`

Update quantity of an item in the cart.

| Param        | Description           |
| ------------ | --------------------- |
| `menuItemId` | The menu item's `_id` |

| Field      | Type    | Required |
| ---------- | ------- | :------: |
| `quantity` | integer | ✅ (≥ 1) |

**Response** `200` — Updated cart.

---

#### DELETE `/cart/items/:menuItemId`

Remove an item from the cart.

**Response** `200` — Updated cart.

---

#### DELETE `/cart`

Clear the entire cart.

**Response** `200`

---

### 7. Orders

Base path: `/api/orders` — 🔒 All routes require auth

#### POST `/orders`

Create a new order from the user's cart.

| Field                         | Type   | Required | Rules                                          |
| ----------------------------- | ------ | :------: | ---------------------------------------------- |
| `deliveryAddress`             | object |    ✅    | See below                                      |
| `deliveryAddress.location`    | string |    ✅    |                                                |
| `deliveryAddress.landmark`    | string |    —     |                                                |
| `deliveryAddress.gpsAddress`  | string |    —     |                                                |
| `deliveryAddress.phoneNumber` | string |    ✅    | Valid phone                                    |
| `paymentMethod`               | string |    ✅    | `mobile_money` \| `card` \| `cash_on_delivery` |
| `notes`                       | string |    —     | Max 500                                        |

**Response** `201`

```json
{
  "status": "success",
  "data": {
    "order": {
      "_id": "...",
      "orderNumber": "EK-20260303-0005",
      "user": "...",
      "items": [
        {
          "menuItem": "...",
          "name": "Jollof Rice",
          "quantity": 2,
          "unitPrice": 45.0,
          "lineTotal": 90.0
        }
      ],
      "deliveryAddress": {
        "location": "East Legon, Accra",
        "landmark": "Near A&C Mall",
        "phoneNumber": "+233201234567"
      },
      "deliveryFee": 10.0,
      "subtotal": 90.0,
      "tax": 0,
      "totalAmount": 100.0,
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

> Only orders with `status: "pending"` can be cancelled.

---

#### GET `/orders` 🔐 `order:read`

Get all orders in the system (admin/staff view).

**Response** `200` — Paginated.

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
     ↘ cancelled (from any status)
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

### 8. Payments

Base path: `/api/payments` — 🔒 All routes require auth

#### POST `/payments`

Initiate a payment for an order.

| Field      | Type   | Required | Rules                                          |
| ---------- | ------ | :------: | ---------------------------------------------- |
| `orderId`  | string |    ✅    | Order ObjectId                                 |
| `method`   | string |    ✅    | `mobile_money` \| `card` \| `cash_on_delivery` |
| `provider` | string |    —     | e.g. `MTN MoMo`, `Paystack`                    |

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

#### GET `/payments/my`

Get the current user's payment history.

**Response** `200` — `{ data: { payments: [...] } }`

---

#### GET `/payments/order/:orderId`

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

Refund a payment.

| Field    | Type   | Required | Rules                              |
| -------- | ------ | :------: | ---------------------------------- |
| `amount` | number |    —     | Min 0.01 (defaults to full amount) |
| `reason` | string |    —     | Max 500                            |

**Response** `200`

---

### 9. Testimonials

Base path: `/api/testimonials`

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

Base path: `/api/likes` — 🔒 All routes require auth

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

Base path: `/api/newsletter`

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

Base path: `/api/admin` — 🔒 All routes require auth

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

### 13. Analytics

Base path: `/api/analytics` — 🔐 All routes require `report:read` permission

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

Base path: `/api/reservations`

#### POST `/reservations`

Create a new reservation. **No auth required** — guests can make reservations.

| Field             | Type    | Required | Rules                                   |
| ----------------- | ------- | :------: | --------------------------------------- |
| `guestName`       | string  |    ✅    | Max 100                                 |
| `guestEmail`      | string  |    —     | Valid email                             |
| `guestPhone`      | string  |    ✅    | Valid phone                             |
| `date`            | string  |    ✅    | ISO date, must be future (`2026-03-10`) |
| `time`            | string  |    ✅    | `HH:MM` format (`19:30`)                |
| `partySize`       | integer |    ✅    | 1–50                                    |
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
  items: {
    menuItem: string;
    name: string;                // snapshot
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  deliveryAddress: {
    location: string;
    landmark?: string;
    gpsAddress?: string;
    phoneNumber: string;
  };
  deliveryFee: number;
  subtotal: number;
  tax: number;
  totalAmount: number;
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

| Method | Path                           | Auth | Permission             |
| :----: | ------------------------------ | :--: | ---------------------- |
|  POST  | `/auth/signup`                 |  —   | —                      |
|  POST  | `/auth/login`                  |  —   | —                      |
|  POST  | `/auth/google`                 |  —   | —                      |
|  POST  | `/auth/apple`                  |  —   | —                      |
|  POST  | `/auth/refresh`                |  —   | —                      |
|  POST  | `/auth/logout`                 |  —   | —                      |
|  GET   | `/auth/verify-email/:token`    |  —   | —                      |
|  POST  | `/auth/forgot-password`        |  —   | —                      |
| PATCH  | `/auth/reset-password/:token`  |  —   | —                      |
|  GET   | `/auth/me`                     |  🔒  | —                      |
| PATCH  | `/auth/update-password`        |  🔒  | —                      |
| PATCH  | `/auth/update-profile`         |  🔒  | —                      |
|        |                                |      |                        |
|  GET   | `/categories`                  |  —   | —                      |
|  GET   | `/categories/:id`              |  —   | —                      |
|  GET   | `/categories/slug/:slug`       |  —   | —                      |
|  POST  | `/categories`                  |  🔒  | `category:create`      |
| PATCH  | `/categories/:id`              |  🔒  | `category:update`      |
| DELETE | `/categories/:id`              |  🔒  | `category:delete`      |
|        |                                |      |                        |
|  GET   | `/menu-items`                  |  —   | —                      |
|  GET   | `/menu-items/:id`              |  —   | —                      |
|  GET   | `/menu-items/slug/:slug`       |  —   | —                      |
|  POST  | `/menu-items`                  |  🔒  | `menu:create`          |
| PATCH  | `/menu-items/:id`              |  🔒  | `menu:update`          |
| DELETE | `/menu-items/:id`              |  🔒  | `menu:delete`          |
|        |                                |      |                        |
|  GET   | `/daily-specials/today`        |  —   | —                      |
|  GET   | `/daily-specials`              |  —   | —                      |
|  GET   | `/daily-specials/:id`          |  —   | —                      |
|  POST  | `/daily-specials`              |  🔒  | `daily_special:create` |
| PATCH  | `/daily-specials/:id`          |  🔒  | `daily_special:update` |
| DELETE | `/daily-specials/:id`          |  🔒  | `daily_special:delete` |
|        |                                |      |                        |
|  GET   | `/addresses`                   |  🔒  | —                      |
|  GET   | `/addresses/:id`               |  🔒  | —                      |
|  POST  | `/addresses`                   |  🔒  | —                      |
| PATCH  | `/addresses/:id`               |  🔒  | —                      |
| DELETE | `/addresses/:id`               |  🔒  | —                      |
|        |                                |      |                        |
|  GET   | `/cart`                        |  🔒  | —                      |
|  POST  | `/cart/items`                  |  🔒  | —                      |
| PATCH  | `/cart/items/:menuItemId`      |  🔒  | —                      |
| DELETE | `/cart/items/:menuItemId`      |  🔒  | —                      |
| DELETE | `/cart`                        |  🔒  | —                      |
|        |                                |      |                        |
|  POST  | `/orders`                      |  🔒  | —                      |
|  GET   | `/orders/my`                   |  🔒  | —                      |
|  GET   | `/orders/:id`                  |  🔒  | —                      |
|  POST  | `/orders/:id/cancel`           |  🔒  | —                      |
|  GET   | `/orders`                      |  🔒  | `order:read`           |
| PATCH  | `/orders/:id/status`           |  🔒  | `order:update`         |
| PATCH  | `/orders/:id/assign-rider`     |  🔒  | `order:update`         |
|        |                                |      |                        |
|  POST  | `/payments`                    |  🔒  | —                      |
|  GET   | `/payments/my`                 |  🔒  | —                      |
|  GET   | `/payments/order/:orderId`     |  🔒  | —                      |
| PATCH  | `/payments/:id/confirm`        |  🔒  | `payment:update`       |
| PATCH  | `/payments/:id/fail`           |  🔒  | `payment:update`       |
|  POST  | `/payments/:id/refund`         |  🔒  | `payment:update`       |
|        |                                |      |                        |
|  GET   | `/testimonials/approved`       |  —   | —                      |
|  GET   | `/testimonials/featured`       |  —   | —                      |
|  POST  | `/testimonials`                |  🔒  | —                      |
|  GET   | `/testimonials/my`             |  🔒  | —                      |
| PATCH  | `/testimonials/:id`            |  🔒  | —                      |
| DELETE | `/testimonials/:id`            |  🔒  | —                      |
|  GET   | `/testimonials`                |  🔒  | `testimonial:read`     |
| PATCH  | `/testimonials/:id/moderate`   |  🔒  | `testimonial:update`   |
|        |                                |      |                        |
|  GET   | `/likes`                       |  🔒  | —                      |
|  POST  | `/likes/:menuItemId`           |  🔒  | —                      |
|  GET   | `/likes/:menuItemId/status`    |  🔒  | —                      |
|        |                                |      |                        |
|  POST  | `/newsletter/subscribe`        |  —   | —                      |
|  POST  | `/newsletter/unsubscribe`      |  —   | —                      |
|  GET   | `/newsletter`                  |  🔒  | `newsletter:read`      |
|  GET   | `/newsletter/count`            |  🔒  | `newsletter:read`      |
|        |                                |      |                        |
|  GET   | `/admin/profile`               |  🔒  | —                      |
| PATCH  | `/admin/profile`               |  🔒  | —                      |
|  GET   | `/admin/profile/providers`     |  🔒  | —                      |
|  GET   | `/admin/users`                 |  🔒  | `user:read`            |
|  GET   | `/admin/users/:id`             |  🔒  | `user:read`            |
| PATCH  | `/admin/users/:id`             |  🔒  | `user:update`          |
| DELETE | `/admin/users/:id`             |  🔒  | `user:delete`          |
|  GET   | `/admin/roles`                 |  🔒  | `setting:read`         |
|  GET   | `/admin/roles/:id`             |  🔒  | `setting:read`         |
| PATCH  | `/admin/roles/:id/permissions` |  🔒  | `setting:update`       |
|  GET   | `/admin/permissions`           |  🔒  | `setting:read`         |
|  GET   | `/admin/audit-logs`            |  🔒  | `audit_log:read`       |
|        |                                |      |                        |
|  GET   | `/analytics/dashboard`         |  🔒  | `report:read`          |
|  GET   | `/analytics/revenue-chart`     |  🔒  | `report:read`          |
|  GET   | `/analytics/sales`             |  🔒  | `report:read`          |
|  GET   | `/analytics/orders`            |  🔒  | `report:read`          |
|  GET   | `/analytics/customers`         |  🔒  | `report:read`          |
|  GET   | `/analytics/menu-performance`  |  🔒  | `report:read`          |
|  GET   | `/analytics/recent-activity`   |  🔒  | `report:read`          |
|  GET   | `/analytics/reservations`      |  🔒  | `report:read`          |
|        |                                |      |                        |
|  POST  | `/reservations`                |  —   | —                      |
|  GET   | `/reservations/my`             |  🔒  | —                      |
|  POST  | `/reservations/:id/cancel`     |  🔒  | —                      |
|  GET   | `/reservations`                |  🔒  | `reservation:read`     |
|  GET   | `/reservations/upcoming`       |  🔒  | `reservation:read`     |
|  GET   | `/reservations/:id`            |  🔒  | `reservation:read`     |
| PATCH  | `/reservations/:id`            |  🔒  | `reservation:update`   |
| PATCH  | `/reservations/:id/status`     |  🔒  | `reservation:update`   |
| DELETE | `/reservations/:id`            |  🔒  | `reservation:delete`   |

---

_Erica's Kitchen API v1.0.0 — Last updated March 2026_
