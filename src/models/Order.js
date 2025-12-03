const { supabase } = require('../config/database');

let orders = [];
let orderHistory = [];
let customerSessions = [];
let sessionCounter = 1;

class Order {
  static async create(orderData) {
    if (supabase) {
      const totalAmount = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      let activeSessionId = orderData.sessionId;
      if (!activeSessionId) {
        const { data: activeSession } = await supabase
          .from('customer_sessions')
          .select('id')
          .eq('table_id', orderData.tableId)
          .eq('status', 'active')
          .single();
        
        if (activeSession) {
          activeSessionId = activeSession.id;
        } else {
          const { data: newSession, error: sessionError } = await supabase
            .from('customer_sessions')
            .insert({ table_id: orderData.tableId })
            .select()
            .single();
          
          if (sessionError) return { data: null, error: sessionError };
          activeSessionId = newSession.id;
        }
      }
      
      const { data, error } = await supabase
        .from('orders')
        .insert({
          customer_session_id: activeSessionId,
          table_id: orderData.tableId,
          items: JSON.stringify(orderData.items),
          total_amount: totalAmount
        })
        .select()
        .single();
      
      if (error) return { data: null, error };
      return { data: { ...data, items: JSON.parse(data.items) }, error: null };
    }
    
    const order = {
      id: Date.now(),
      tableId: orderData.tableId,
      table_id: orderData.tableId,
      items: orderData.items,
      status: 'pending',
      created_at: new Date(),
      timestamp: new Date()
    };
    
    orders.push(order);
    orderHistory.push({ ...order });
    return { data: order, error: null };
  }

  static async getAll() {
    if (supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customer_sessions(*)')
        .in('status', ['pending', 'preparing', 'completed', 'served'])
        .eq('customer_sessions.status', 'active')
        .order('created_at', { ascending: true });
      
      if (error) return { data: null, error };
      
      const ordersWithItems = data.map(order => ({
        ...order,
        items: JSON.parse(order.items)
      }));
      
      return { data: ordersWithItems, error: null };
    }
    
    return { data: orders, error: null };
  }

  static async updateStatus(id, status) {
    if (supabase) {
      const { data, error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) return { data: null, error };
      return { data: { ...data, items: JSON.parse(data.items) }, error: null };
    }
    
    const order = orders.find(o => o.id == id);
    if (!order) return { data: null, error: { message: 'Order not found' } };
    
    order.status = status;
    const historyOrder = orderHistory.find(o => o.id == id);
    if (historyOrder) historyOrder.status = status;
    
    return { data: order, error: null };
  }

  static async resetTable(tableId) {
    if (supabase) {
      const { data: tableOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('table_id', tableId)
        .in('status', ['pending', 'preparing', 'completed', 'served']);
      
      const totalAmount = tableOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      
      const { error: sessionError } = await supabase
        .from('customer_sessions')
        .update({ 
          status: 'completed', 
          session_end: new Date(),
          total_amount: totalAmount
        })
        .eq('table_id', tableId)
        .eq('status', 'active');
      
      if (sessionError) return { data: null, error: sessionError };

      const { data: updatedOrders, error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'served',
          updated_at: new Date()
        })
        .eq('table_id', tableId)
        .neq('status', 'served')
        .select();
      
      return { 
        data: { totalAmount, tableId, ordersUpdated: updatedOrders?.length || 0 }, 
        error: updateError 
      };
    }
    
    const tableOrders = orders.filter(o => o.tableId === tableId);
    const totalAmount = tableOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
    }, 0);
    
    const session = customerSessions.find(s => s.table_id === tableId && s.status === 'active');
    if (session) {
      session.status = 'completed';
      session.session_end = new Date();
      session.total_amount = totalAmount;
    }
    
    orders = orders.filter(o => o.tableId != tableId);
    orderHistory = orderHistory.filter(o => o.tableId != tableId);
    
    return { data: { totalAmount, tableId }, error: null };
  }
}

module.exports = { Order, orders, orderHistory, customerSessions, sessionCounter };
