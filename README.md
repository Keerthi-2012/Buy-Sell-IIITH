# Buy, Sell @ IIITH

A dedicated Buy-Sell web portal built using the MERN stack for the IIIT Hyderabad community. This platform allows users to list items for sale, browse listings, add to cart, place orders with OTP verification, and manage transactions securely.

## 🔧 MERN Stack

- **Frontend**: React.js (with optional libraries like Tailwind CSS, MUI)
- **Backend**: Express.js with Node.js
- **Database**: MongoDB
- **Authentication**: JWT + bcrypt

---

## 🧑‍💻 Features

### 👥 User Authentication

- Registration with IIIT email only
- Login with session persistence (until logout)
- Hashed password storage using `bcrypt`
- JWT-based route protection
- Optional: Google ReCAPTCHA, CAS Login

### 👤 User Model Includes

- First Name, Last Name, Email (IIIT only)
- Age, Contact Number
- Password (hashed)
- Cart (array of item IDs)

### 🛍️ Item Model Includes

- Name, Price, Description
- Category (e.g., clothing, grocery)
- Seller ID

### 📦 Order Model Includes

- Transaction ID
- Buyer ID, Seller ID
- Total Amount
- Hashed OTP

---

## 🔎 Pages & Use Cases

### 1. **Dashboard + Navbar**
- Navbar persists across all internal pages
- Profile page with user info and editable fields

### 2. **Search Items Page**
- Search bar (case-insensitive)
- Category-based filtering (multi-select)
- Item cards with name, price, seller
- Click to open item details

### 3. **Item Page**
- View full item description, seller, and price
- Add to Cart button
- Buy Now button
- Edit Item button
- Delete Item button

### 4. **My Cart**
- Displays added items
- Remove items from cart
- Show total price
- Place final order (generates OTP)

### 5. **Orders History**
- Tabs for:
  - Pending Orders (with OTPs)
  - Purchased Items
  - Sold Items

### 6. **Deliver Items**
- Sellers view pending deliveries
- Enter OTP to confirm delivery
- Valid OTP completes transaction and updates DB

