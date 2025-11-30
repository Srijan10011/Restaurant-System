# Restaurant Ordering System with RBAC

## Setup
```bash
npm install
npm start
```

## Access Points

### Customer Terminal
- URL: `http://localhost:3000/customer.html?table=1`
- No login required
- Place orders and view status

### Staff Terminal
- URL: `http://localhost:3000/staff.html`
- Login required

## Default Staff Accounts
- **Admin**: username: `admin`, password: `admin123`
- **Kitchen**: username: `kitchen`, password: `kitchen123`
- **Counter**: username: `counter`, password: `counter123`
- **Waiter**: username: `waiter`, password: `waiter123`

## Role Permissions
- **Customer**: Place orders, view order status
- **Kitchen**: Update order status (pending → preparing → completed)
- **Counter**: View all orders, reset tables, process checkout
- **Admin**: Manage menu items and staff accounts
- **Waiter**: View orders (can be extended to place orders for tables)

## API Endpoints
- `POST /login` - Staff authentication
- `POST /register` - Add new staff (admin only)
- `GET /menu` - View menu items
- `POST /menu` - Add menu item (admin only)
- `PATCH /menu/:id` - Update menu item (admin only)
- `DELETE /menu/:id` - Delete menu item (admin only)
- `POST /orders` - Place order
- `GET /orders` - View orders (staff only)
- `PATCH /orders/:id` - Update order status (kitchen only)
- `DELETE /orders/:tableId` - Reset table (counter only)

## Real-time Features
- Order status updates via WebSocket
- Kitchen receives new orders instantly
- Customer sees status changes in real-time
