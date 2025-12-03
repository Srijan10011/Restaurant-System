# Restaurant System Architecture

## Project Structure

```
src/
├── app.js                  # Main application entry point
├── config/
│   └── database.js         # Database configuration (Supabase)
├── middleware/
│   └── auth.js            # Authentication middleware
├── models/
│   ├── User.js            # User data operations
│   ├── Menu.js            # Menu data operations
│   └── Order.js           # Order data operations
└── routes/
    ├── auth.js            # Authentication routes
    ├── customer.js        # Customer session routes
    ├── debug.js           # Debug utilities
    ├── menu.js            # Menu CRUD routes
    └── orders.js          # Order management routes
```

## Architecture Principles

### MVC Pattern
- **Models**: Handle data operations and business logic
- **Views**: Frontend HTML files (customer.html, staff.html)
- **Controllers**: Route handlers in `/routes` directory

### Separation of Concerns
- **Config**: Database connections and environment setup
- **Middleware**: Cross-cutting concerns like authentication
- **Models**: Data layer abstraction
- **Routes**: HTTP request handling

### Features
- **Dual Storage**: Supports both Supabase and in-memory storage
- **Role-based Access Control**: Admin, Kitchen, Counter, Waiter roles
- **Real-time Updates**: WebSocket integration for live order updates
- **Session Management**: Customer table sessions with order tracking

## API Endpoints

### Authentication
- `POST /login` - Staff login
- `POST /signup` - Staff registration
- `POST /register` - Admin creates staff accounts
- `POST /logout` - Session termination

### Menu Management
- `GET /menu` - View available items
- `POST /menu` - Add item (admin only)
- `PATCH /menu/:id` - Update item (admin only)
- `DELETE /menu/:id` - Delete item (admin only)

### Order Management
- `POST /orders` - Place order
- `GET /orders` - View orders (staff only)
- `PATCH /orders/:id` - Update order status (kitchen)
- `PATCH /orders/:id/serve` - Mark as served (waiter)
- `DELETE /orders/:tableId` - Reset table (counter)

### Customer Operations
- `POST /customer-session` - Create/get table session
- `GET /orders/history/:tableId` - Order history for table
- `GET /bill/:tableId` - Calculate bill for table

## Running the Application

```bash
npm start      # Production
npm run dev    # Development with nodemon
```
