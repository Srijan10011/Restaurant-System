const { supabase } = require('../config/database');

let menu = [
  { id: 1, name: 'Burger', price: 12.99, category: 'main', available: true },
  { id: 2, name: 'Pizza', price: 15.99, category: 'main', available: true },
  { id: 3, name: 'Coke', price: 2.99, category: 'drink', available: true }
];

class Menu {
  static async getAll() {
    if (supabase) {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('available', true);
      return { data, error };
    }
    return { data: menu.filter(item => item.available), error: null };
  }

  static async create(itemData) {
    if (supabase) {
      const { data, error } = await supabase
        .from('menu_items')
        .insert(itemData)
        .select()
        .single();
      return { data, error };
    }
    
    const newItem = { id: Date.now(), ...itemData, available: true };
    menu.push(newItem);
    return { data: newItem, error: null };
  }

  static async update(id, updates) {
    if (supabase) {
      const { data, error } = await supabase
        .from('menu_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    }
    
    const item = menu.find(m => m.id == id);
    if (!item) return { data: null, error: { message: 'Item not found' } };
    Object.assign(item, updates);
    return { data: item, error: null };
  }

  static async delete(id) {
    if (supabase) {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);
      return { error };
    }
    
    const index = menu.findIndex(m => m.id == id);
    if (index === -1) return { error: { message: 'Item not found' } };
    menu.splice(index, 1);
    return { error: null };
  }
}

module.exports = { Menu, menu };
