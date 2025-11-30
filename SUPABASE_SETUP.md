# Supabase Setup Instructions

## 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy your project URL and anon key

## 2. Configure Environment
1. Update `.env` file with your Supabase credentials:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
JWT_SECRET=your-secret-key
```

## 3. Create Database Tables
1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL from `schema.sql` file
3. This creates all necessary tables and **disables RLS** for easy access
4. Tables created: users, customer_sessions, menu_items, orders

## 4. Default Passwords
The default staff accounts use these passwords:
- **admin**: `admin123`
- **kitchen**: `kitchen123`
- **counter**: `counter123`
- **waiter**: `waiter123`

## 5. Features Enabled
- **Unique Customer Sessions**: Each table gets incremental customer IDs
- **Session Tracking**: Entry/exit timestamps for analytics
- **Order Analytics**: Track what was ordered when
- **Persistent Storage**: All data saved in Supabase
- **Staff Management**: User accounts stored in database

## 6. Analytics Queries
```sql
-- Daily revenue
SELECT DATE(session_start) as date, SUM(total_amount) as revenue
FROM customer_sessions 
WHERE status = 'completed'
GROUP BY DATE(session_start);

-- Popular items by time
SELECT EXTRACT(hour FROM created_at) as hour, 
       jsonb_array_elements(items)->>'name' as item,
       COUNT(*) as orders
FROM orders 
GROUP BY hour, item
ORDER BY hour, orders DESC;

-- Average session duration
SELECT AVG(EXTRACT(epoch FROM (session_end - session_start))/60) as avg_minutes
FROM customer_sessions 
WHERE status = 'completed';
```
