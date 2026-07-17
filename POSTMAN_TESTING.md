# Faith Over Fear Backend — Postman Testing Guide

## Setup

### 1. Environment Variables

Create `fof-backend/.env` from the example:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

PORT=5000
NODE_ENV=development

ADMIN_EMAILS=admin@faithoverfear.rw,manager@test.com

ALLOWED_ORIGINS=https://faithoverfearrw.netlify.app,http://localhost:3000,http://localhost:5173
```

### 2. Start the server

```bash
cd fof-backend
npm run dev
# Server runs on http://localhost:5000
```

### 3. Postman CORS Note

The server uses the `cors` middleware with `credentials: true`. When you send requests from Postman, set the request header:

```
Origin: http://localhost:3000
```

Without a matching `Origin`, Postman (and any client) is treated as a non-browser request and CORS is not enforced — the request still works. If you get CORS errors from a browser, use one of the allowed origins listed above.

---

## Base URL

```
http://localhost:5000
```

---

## Step 1 — Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "admin@faithoverfear.rw",
  "password": "SecurePass123!",
  "name": "Admin User"
}
```

**Response (201):**

```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "admin@faithoverfear.rw",
    "name": "Admin User",
    "role": "admin"
  }
}
```

> `role` is `admin` if the email matches one in `ADMIN_EMAILS`, otherwise `customer`.
> Password must be 8+ characters. Email must be valid format.
> Rate limit: 5 requests per 15 minutes.

---

## Step 2 — Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@faithoverfear.rw",
  "password": "SecurePass123!"
}
```

**Response (200):**

```json
{
  "success": true,
  "access_token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "user": {
    "id": "uuid-here",
    "email": "admin@faithoverfear.rw",
    "name": "Admin User",
    "role": "admin"
  }
}
```

> Copy the `access_token` from the response. Use it as a Bearer token for all authenticated requests below.

---

## Step 3 — Google OAuth (optional)

```http
POST /api/auth/google
Content-Type: application/json

{
  "id_token": "your-google-id-token"
}
```

**Response (200):**

```json
{
  "success": true,
  "access_token": "...",
  "refresh_token": "...",
  "user": {
    "id": "uuid-here",
    "email": "user@gmail.com",
    "name": "Google User",
    "role": "customer"
  }
}
```

---

## Public Endpoints

### Health Check

```http
GET /health
```

**Response (200):**

```json
{
  "status": "ok",
  "timestamp": "2026-07-02T10:00:00.000Z"
}
```

---

### Get All Drops (public)

```http
GET /api/drops
```

**Query Params (optional):**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status (`live`, `upcoming`, `closed`) |

**Response (200):**

```json
{
  "success": true,
  "drops": [
    {
      "id": "uuid-here",
      "title": "Summer Drop",
      "slug": "summer-drop",
      "description": "...",
      "status": "live",
      "release_date": "2026-07-01T00:00:00.000Z",
      "close_date": "2026-07-31T00:00:00.000Z",
      "image_url": "https://...",
      "hero_image": "https://...",
      "hero_video": "https://...",
      "theme_scripture": "...",
      "created_at": "2026-07-01T00:00:00.000Z",
      "updated_at": "2026-07-01T00:00:00.000Z"
    }
  ]
}
```

> Only drops with `status` of `live` or `upcoming` are returned.

---

### Get Active Drop (public)

```http
GET /api/drops/active
```

Returns the single currently active drop (status = `live`, within release/close window).

**Response (200):**

```json
{
  "success": true,
  "drop": { ... }
}
```

Returns `{ "success": true, "drop": null }` if no active drop.

---

### Get Drop by Slug (public)

```http
GET /api/drops/:slug
```

**Example:**

```
GET /api/drops/summer-drop
```

**Response (200):**

```json
{
  "success": true,
  "drop": { ... }
}
```

---

### Get All Products (public)

```http
GET /api/products
```

**Query Params (optional):**

| Param | Type | Description |
|-------|------|-------------|
| `dropId` | number | Filter products by drop ID |

If `dropId` is provided, returns products for that drop. Otherwise returns products for the active drop.

**Response (200):**

```json
{
  "success": true,
  "products": [
    {
      "id": 1,
      "name": "T-Shirt",
      "slug": "t-shirt",
      "description": "...",
      "base_price": 25.00,
      "images": ["https://..."],
      "is_active": true,
      "drop_id": "uuid-here",
      "product_variants": [
        {
          "id": 1,
          "product_id": 1,
          "color": "Black",
          "size": "M",
          "sku": "TSH-M-BLK",
          "stock": 10,
          "price_override": null
        }
      ]
    }
  ]
}
```

---

### Get Product by Slug (public)

```http
GET /api/products/:slug
```

**Example:**

```
GET /api/products/t-shirt
```

---

### Add to Waitlist (public)

```http
POST /api/waitlist
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+250788000000",
  "source": "homepage"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Added to waitlist successfully",
  "entry": {
    "id": "uuid-here",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+250788000000",
    "source": "homepage",
    "notified": false,
    "created_at": "2026-07-02T10:00:00.000Z"
  }
}
```

---

## Authenticated Endpoints

For all endpoints below, include the Authorization header:

```
Authorization: Bearer <access_token>
```

---

### Get My Profile

```http
GET /api/auth/me
```

**Response (200):**

```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "admin@faithoverfear.rw",
    "name": "Admin User",
    "role": "admin"
  }
}
```

---

### Get Cart

```http
GET /api/cart
```

**Headers (optional, for guest carts):**

```
X-Session-Id: guest-session-123
```

**Response (200):**

```json
{
  "success": true,
  "cart": {
    "id": "uuid-here",
    "user_id": "uuid-here",
    "session_id": null,
    "items": [
      {
        "id": "uuid-here",
        "cart_id": "uuid-here",
        "product_variant_id": 1,
        "quantity": 2,
        "product_variants": {
          "id": 1,
          "product_id": 1,
          "color": "Black",
          "size": "M",
          "sku": "TSH-M-BLK",
          "stock": 10
        },
        "products": {
          "id": 1,
          "name": "T-Shirt",
          "slug": "t-shirt",
          "images": ["https://..."],
          "base_price": 25.00,
          "is_active": true
        }
      }
    ]
  }
}
```

---

### Add Cart Item

```http
POST /api/cart/items
Content-Type: application/json

{
  "variantId": 1,
  "quantity": 2
}
```

---

### Update Cart Item Quantity

```http
PUT /api/cart/items/:variantId
Content-Type: application/json

{
  "quantity": 3
}
```

**Example:**

```
PUT /api/cart/items/1
```

---

### Remove Cart Item

```http
DELETE /api/cart/items/:variantId
```

---

### Clear Cart

```http
DELETE /api/cart
```

---

### Create Order

```http
POST /api/orders
Content-Type: application/json

{
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "+250788000000",
  "shipping_address": "KG 123 St, Kigali, Rwanda",
  "payment_method": "reservation",
  "items": [
    {
      "product_variant_id": 1,
      "quantity": 2
    }
  ]
}
```

> Use `items` array for direct product selection, or omit for cart-based checkout.
> `payment_method`: `reservation` (default) or `mtn_momo`.

**Response (201):**

```json
{
  "success": true,
  "order": {
    "id": "uuid-here",
    "status": "pending",
    "total_amount": 50.00,
    "created_at": "2026-07-02T10:00:00.000Z",
    "items": [
      {
        "product_name": "T-Shirt",
        "size": "M",
        "color": "Black",
        "unit_price": 25.00,
        "quantity": 2,
        "subtotal": 50.00
      }
    ]
  }
}
```

---

### Get My Orders

```http
GET /api/orders/my
```

**Response (200):**

```json
{
  "success": true,
  "orders": [
    {
      "id": "uuid-here",
      "status": "pending",
      "total_price": 50.00,
      "payment_method": "reservation",
      "customer_name": "John Doe",
      "created_at": "2026-07-02T10:00:00.000Z",
      "order_items": [...]
    }
  ]
}
```

---

### Get Order by ID

```http
GET /api/orders/:id
```

---

### Get Notifications

```http
GET /api/notifications
```

**Query Params (optional):**

| Param | Type | Description |
|-------|------|-------------|
| `limit` | number | Max results (default: 50) |
| `offset` | number | Pagination offset (default: 0) |

**Response (200):**

```json
{
  "success": true,
  "notifications": [
    {
      "id": "uuid-here",
      "type": "reservation",
      "reference_id": "uuid-here",
      "title": "New Drop Available",
      "description": "Summer drop is now live",
      "is_seen": false,
      "created_at": "2026-07-02T10:00:00.000Z"
    }
  ],
  "unreadCount": 3
}
```

---

### Get Unread Notification Count

```http
GET /api/notifications/unread-count
```

**Response (200):**

```json
{
  "success": true,
  "count": 3
}
```

---

### Mark All Notifications as Read

```http
PUT /api/notifications/read-all
```

**Response (200):**

```json
{
  "success": true,
  "message": "Marked 3 notifications as read"
}
```

---

### Mark Single Notification as Read

```http
PUT /api/notifications/:id/read
```

**Example:**

```
PUT /api/notifications/abc123-uuid
```

---

## Admin Endpoints

For all endpoints below, include the Authorization header of an admin user:

```
Authorization: Bearer <admin_access_token>
```

---

### Create Drop

```http
POST /api/admin/drops
Content-Type: application/json

{
  "title": "Summer Drop 2026",
  "description": "Limited edition summer collection",
  "image_url": "https://example.com/image.jpg",
  "hero_image": "https://example.com/hero.jpg",
  "hero_video": "https://example.com/video.mp4",
  "theme_scripture": "Isaiah 40:31",
  "release_date": "2026-07-01T00:00:00.000Z",
  "close_date": "2026-07-31T00:00:00.000Z",
  "status": "upcoming",
  "products": [
    {
      "name": "Graphic Tee",
      "description": "Premium cotton tee",
      "base_price": 30.00,
      "images": ["https://example.com/tee.jpg"],
      "is_active": true
    }
  ]
}
```

> `status` options: `upcoming`, `live`, `closed`
> `release_date` and `close_date` are ISO 8601 strings.
> `products` is optional — creates products linked to this drop.

**Response (201):**

```json
{
  "success": true,
  "drop": {
    "id": "uuid-here",
    "title": "Summer Drop 2026",
    "slug": "summer-drop-2026",
    ...
  }
}
```

---

### Update Drop

```http
PUT /api/admin/drops/:id
Content-Type: application/json

{
  "title": "Updated Drop Title",
  "status": "live",
  "close_date": "2026-08-15T00:00:00.000Z"
}
```

> Updating `status` to `live` automatically triggers the `activate_drop` RPC.

**Response (200):**

```json
{
  "success": true,
  "drop": { ... }
}
```

---

### Activate Drop

```http
POST /api/admin/drops/:id/activate
```

Manually activates a drop (sets status to `live`, triggers RPC).

**Response (200):**

```json
{
  "success": true,
  "drop": { ... }
}
```

---

### Create Product

```http
POST /api/admin/products
Content-Type: application/json

{
  "name": "New Product",
  "description": "Product description",
  "base_price": 25.00,
  "images": ["https://example.com/img.jpg"],
  "is_active": true,
  "drop_id": "uuid-of-drop"
}
```

---

### Update Product

```http
PUT /api/admin/products/:id
Content-Type: application/json

{
  "name": "Updated Product Name",
  "base_price": 30.00
}
```

---

### Delete Product (soft delete)

```http
DELETE /api/admin/products/:id
```

**Response (200):**

```json
{
  "success": true,
  "message": "Product deleted"
}
```

---

### Get All Orders (admin)

```http
GET /api/admin/orders
```

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by `pending`, `confirmed`, `completed`, `cancelled`, or `all` |
| `startDate` | string | ISO date — filter `created_at >=` |
| `endDate` | string | ISO date — filter `created_at <=` |

**Response (200):**

```json
{
  "success": true,
  "orders": [
    {
      "id": "uuid-here",
      "status": "pending",
      "total_price": 50.00,
      "payment_method": "reservation",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "phone_number": "+250788000000",
      "created_at": "2026-07-02T10:00:00.000Z",
      "order_items": [...],
      "users": {
        "id": "uuid-here",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

---

### Update Order Status

```http
PUT /api/admin/orders/:id/status
Content-Type: application/json

{
  "status": "confirmed"
}
```

> Valid statuses: `pending`, `confirmed`, `completed`, `cancelled`

---

### Cancel Order

```http
POST /api/admin/orders/:id/cancel
```

---

### Verify Payment

```http
POST /api/admin/payments/verify
Content-Type: application/json

{
  "orderId": "uuid-here",
  "paymentReference": "MTN-12345-ABC",
  "paymentMethod": "mtn_momo",
  "proofUrl": "https://example.com/proof.jpg",
  "notes": "Payment confirmed via MTN MoMo"
}
```

**Response (200):**

```json
{
  "success": true,
  "order": {
    "id": "uuid-here",
    "status": "confirmed",
    "payment_reference": "MTN-12345-ABC",
    "payment_method": "mtn_momo",
    "updated_at": "2026-07-02T10:00:00.000Z"
  },
  "verification": {
    "id": "uuid-here",
    "verified_at": "2026-07-02T10:00:00.000Z",
    "status": "approved"
  }
}
```

---

### Get All Waitlist Entries (admin)

```http
GET /api/waitlist
```

**Response (200):**

```json
{
  "success": true,
  "entries": [...]
}
```

---

## Collection Setup

### Environment Variables (Postman)

Set these in Postman Environment or Globals:

| Key | Value |
|-----|-------|
| `baseUrl` | `http://localhost:5000` |
| `accessToken` | *(set after login)* |
| `adminEmail` | `admin@faithoverfear.rw` |
| `adminPassword` | *(your admin password)* |

### Pre-request Script (for authenticated requests)

Attach this script to every authenticated request (or use a collection-level pre-request script):

```
if (pm.environment.get("accessToken")) {
  pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + pm.environment.get("accessToken") });
}
pm.request.headers.upsert({ key: "Origin", value: "http://localhost:3000" });
pm.request.headers.upsert({ key: "Content-Type", value: "application/json" });
```

### Login → Set Token (test script on login request)

```
if (pm.response.code === 200) {
  const body = pm.response.json();
  if (body.access_token) {
    pm.environment.set("accessToken", body.access_token);
    console.log("Token saved:", body.access_token.substring(0, 20) + "...");
  }
}
```

---

## Testing Order

```
1. GET /health                          → verify server is up
2. POST /api/auth/register              → create admin user
3. POST /api/auth/login                 → get Bearer token
4. GET /api/drops                       → should be [] initially
5. POST /api/admin/drops                → create a drop (needs token, needs ADMIN_EMAILS)
6. GET /api/drops                       → should return the new drop
7. GET /api/products                    → should return products
8. POST /api/admin/products             → create products
9. POST /api/cart/items                 → add to cart
10. GET /api/cart                       → verify cart contents
11. POST /api/orders                    → place order
12. GET /api/orders/my                  → verify order
13. PUT /api/admin/orders/:id/status    → transition order status
14. GET /api/notifications              → check notifications
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "statusCode": 400,
  "message": "Validation error message",
  "context": {
    "method": "POST",
    "url": "/api/auth/login",
    "errorId": "A1B2C3D4"
  }
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error (missing fields, bad format) |
| 401 | Missing or invalid Bearer token |
| 403 | Admin role required for this endpoint |
| 404 | Resource not found |
| 418 | Rate limited (too many requests) |
| 500 | Server error |

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `Invalid email or password` on login | Email not confirmed in Supabase | Disable "Enable email confirmations" in Supabase Auth settings |
| `Confirm your email before logging in` | Same as above | Disable email confirmations or click the confirmation link |
| Empty `drops: []` despite DB data | RLS blocked reads | Already fixed — now uses supabaseAdmin for reads |
| `Missing Bearer token` | No Authorization header set | Set `Authorization: Bearer <token>` header |
| `Admin role required` | User email not in `ADMIN_EMAILS` env var | Register with an email listed in `.env` `ADMIN_EMAILS` |
| `User profile not found` | User exists in auth.users but not in public.users | This is handled automatically — profile is auto-created on login |
