# Restaurant Ordering System with Role-Based Access Control (RBAC)

A comprehensive restaurant management system built with Node.js, Express, Socket.io, and Supabase that enables seamless order management across different staff roles and customer interactions.

## 🚀 Features

### Customer Experience
- **Table-based ordering** - Customers access via unique table URLs
- **Real-time menu browsing** - Interactive menu with categories and pricing
- **Shopping cart functionality** - Add/remove items before ordering
- **Live order tracking** - Real-time status updates (pending → preparing → completed → served)
- **Session management** - Automatic session creation on first order, clean slate after checkout

### Staff Management (RBAC)
- **Kitchen Staff** - View and update order status (pending → preparing → completed)
- **Waiters** - See completed orders ready for serving, mark as served
- **Counter Staff** - Comprehensive order management with checkout capabilities
- **Admin** - Full system control including menu and staff management

### Counter Dashboard Features
- **Table-grouped orders** - All items consolidated by table with totals
- **Item modification** - Add/remove items from existing orders
- **Order cancellation** - Cancel individual orders or entire tables
- **Checkout confirmation** - Multi-step confirmation process
- **Add items interface** - Dropdown menu to add items to any table

### Real-time Updates
- **WebSocket integration** - Instant updates across all terminals
- **Order status sync** - Kitchen updates immediately visible to waiters/counter
- **Table reset notifications** - Automatic cleanup when tables are checked out

## 🛠 Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Socket.io
- **Authentication**: JWT-based session management
- **Frontend**: Vanilla HTML/CSS/JavaScript

## 📋 Default Staff Accounts

- **Admin**: `admin` / `admin123` - Full system access
- **Kitchen**: `kitchen` / `kitchen123` - Order status management
- **Counter**: `counter` / `counter123` - Checkout and order modification
- **Waiter**: `waiter` / `waiter123` - Serve completed orders

## 🔧 Setup & Installation

```bash
# Install dependencies
npm install

# Start the server
npm start
```

## 🌐 Access Points

- **Customer Terminal**: `http://localhost:3000/customer.html?table=1`
- **Staff Terminal**: `http://localhost:3000/staff.html`

## 🏗 Architecture

### Database Schema
- **Users** - Staff authentication and roles
- **Customer Sessions** - Track table occupancy and session totals
- **Menu Items** - Restaurant menu with pricing and categories
- **Orders** - Individual orders linked to sessions with status tracking

### Security Features
- Role-based access control for all endpoints
- Session-based authentication for staff
- Table isolation for customer data
- Automatic session cleanup on checkout

## 📊 Business Logic

1. **Customer Flow**: Browse menu → Add to cart → Place order → Track status
2. **Kitchen Flow**: Receive orders → Start preparing → Mark complete
3. **Waiter Flow**: See completed orders → Serve to customers
4. **Counter Flow**: Monitor all tables → Modify orders → Process checkout

## 🔄 Session Management

- Sessions created only on first customer order (not page load)
- Multiple orders per session supported
- Clean table reset preserves order history in database
- New customers get fresh sessions automatically

This system provides a complete restaurant operation solution with clear role separation, real-time communication, and comprehensive order lifecycle management.
