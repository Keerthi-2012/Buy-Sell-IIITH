# BuySell IIITH

A buy and sell platform for IIIT Hyderabad students. Post something you no longer need, browse what others are selling, and hand it over in person with a one-time code so both sides know the deal actually happened.

The backend is Express with MongoDB, and the frontend is React with Vite and Redux.

## Running it locally

You'll need Node.js and a MongoDB connection string (a free Atlas cluster works fine).

Start the backend:

```bash
cd backend
cp .env.example .env     # add your MONGO_URI and a JWT_SECRET
npm install
npm run dev
```

Then, in a second terminal, start the frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173. The dev server forwards `/api` requests to the backend on port 8000, so there's nothing else to configure.

The backend won't start if `MONGO_URI` or `JWT_SECRET` is missing. To generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Tests

```bash
cd backend && npm test     # API tests
cd frontend && npm test    # component and logic tests
```

The backend tests spin up a temporary in-memory MongoDB, so they don't touch your real data. The first run downloads a MongoDB binary, which takes a minute.

## How a sale works

1. A seller lists an item, with how many units they have. It's visible to everyone while any units are left.
2. A buyer places an order, either straight from the item page or by checking out their cart, choosing how many units they want. Those units are taken out of stock immediately, so two people can never buy the same unit.
3. The buyer sees a 6-digit OTP on their Orders page.
4. When they meet, the buyer gives the seller the OTP, and the seller enters it on the Delivery page. The order completes and the item is marked sold.
5. If plans fall through, either side can cancel a pending order and its units go back on sale. If nobody finishes or cancels an order within a week, it's released automatically.
6. After a completed order, the buyer can rate the seller. Ratings and recent reviews show up on that seller's item pages. Each buyer counts once per seller, however many orders they place: rating again updates their rating instead of adding another.

A few details behind that:

- An item's status follows its stock: available while units are left, reserved when the rest are in pending orders, sold once the last order completes. Sellers can restock a listing from its edit page.
- A cart holds an item with a quantity, capped at what's in stock. Each order covers one item at the chosen quantity, with its own OTP.
- Buyer, seller and price are worked out by the server from the logged-in user and the item. The client only says which item.
- Both buying and selling need an age and contact number on the profile, since you're meeting in person. First-time CAS users get a banner asking for them.
- OTPs are never stored in plain text. Only the buyer can see theirs, and five wrong guesses lock that order for 15 minutes.

## Logging in

Users can register with an email and password, or sign in through IIIT CAS. Registration is limited to IIIT email domains (change this with `ALLOWED_EMAIL_DOMAINS`).

The session is a single httpOnly cookie, so nothing sensitive sits in `localStorage`. CAS accounts don't have a password. If someone signs in with CAS using an email that already has a password account, CAS takes over that account and the old password stops working, since only CAS can confirm who really owns the address.

## Sellers and admins

Sellers have a **My Listings** page showing everything they've posted, including reserved and sold items.

Admins get an **Admin** page with every order and listing on the platform, and can remove listings (a pending order on a removed listing is cancelled for the buyer). Admin rights come from `ADMIN_EMAILS` and only apply to accounts that signed in through CAS, so nobody can claim an admin address just by registering with it.

## Configuration

**Backend** (`backend/.env`)

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string (required) |
| `JWT_SECRET` | Signs login cookies; 32+ characters in production (required) |
| `PORT` | Defaults to 8000 |
| `CLIENT_ORIGIN` | Frontend URL(s) allowed by CORS, comma-separated |
| `OTP_ENCRYPTION_KEY` | Separate key for encrypting OTPs; falls back to `JWT_SECRET` |
| `ALLOWED_EMAIL_DOMAINS` | Domains that can register |
| `ADMIN_EMAILS` | Comma-separated admin emails (CAS sign-in only) |
| `RESERVATION_DAYS` | Days before an unfinished order is released; defaults to 7 |
| `CAS_URL`, `CAS_ALLOWED_SERVICES` | IIIT CAS server and the callback URLs it may redirect to |
| `COOKIE_SAMESITE` | `lax` (default), `strict` or `none` |
| `TRUST_PROXY` | Set to `true` if you run behind a reverse proxy |

**Frontend** (`frontend/.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Only needed if the API is on a different origin than the site |
| `VITE_CAS_CALLBACK` | Where CAS sends users back; must be listed in `CAS_ALLOWED_SERVICES` |
| `VITE_CLIENT_BASE_URL` | Where users land after logging out of CAS |

## Deploying

Build the frontend with `npm run build` inside `frontend/`, then start the backend with `NODE_ENV=production`. In production the backend serves the built frontend itself, so you only need to run one process.

## API reference

All routes live under `/api/v1`. Routes marked "login" need the session cookie.

| Route | Access | Notes |
| --- | --- | --- |
| `POST /user/register` | public | |
| `POST /user/login` | public | |
| `GET /user/cas-login` | public | Exchanges a CAS ticket for a session |
| `GET /user/logout` | public | |
| `GET /user/profile` | login | |
| `PUT /user/update` | login | |
| `GET /item` | public | Filters: `search`, `category`, `condition`, `minPrice`, `maxPrice`, `sort`, `page`, `limit` |
| `GET /item/categories` | public | |
| `GET /item/mine` | login | Your own listings in every status |
| `GET /item/:id` | public | Includes the seller's rating summary |
| `POST /item` | login | |
| `PUT /item/:id` | login | Owner only; setting `quantity` restocks the listing |
| `DELETE /item/:id` | login | Owner only, and not while it has pending orders |
| `GET /cart` | login | |
| `POST /cart/add` | login | Body: `{ itemId, quantity? }`; adding again raises the quantity, up to the stock |
| `PATCH /cart/item` | login | Sets the exact quantity. Body: `{ itemId, quantity }` |
| `POST /cart/remove` | login | Body: `{ itemId }` |
| `POST /order` | login | Buy one item. Body: `{ item, quantity? }` |
| `POST /order/checkout` | login | Buys the whole cart at its quantities, or just `{ items: [...] }` from the cart. All or nothing |
| `GET /order/placed` | login | Your purchases, with your OTPs for pending ones |
| `GET /order/sold` | login | Your sales waiting for delivery |
| `GET /order/cancelled` | login | |
| `PATCH /order/:transactionId/complete` | login | Seller only. Body: `{ otp }` |
| `PATCH /order/:transactionId/cancel` | login | Buyer or seller, pending orders only |
| `POST /order/:transactionId/review` | login | Buyer only, after completion. One rating per buyer per seller: rating again updates it (200 instead of 201). Body: `{ rating, comment? }` |
| `GET /review/seller/:id` | public | Rating summary and recent reviews |
| `GET /admin/orders`, `GET /admin/items` | admin | Optional `status`, `page`, `limit` |
| `DELETE /admin/items/:id` | admin | Removes a listing and cancels its pending order |
