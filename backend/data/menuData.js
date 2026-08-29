const menuData = [
  // --- MOMO ---
  { id: 1, name: "Chicken Momos", image: "/menu/Chicken Momos.png", price: 140, category: "Momo", isVeg: false, description: "Classic steamed chicken momos." },
  { id: 2, name: "Chicken Fry Momos", image: "/menu/Chicken fry Momos.jpf.jpg", price: 160, category: "Momo", isVeg: false, description: "Crispy fried chicken momos." },
  { id: 3, name: "Chicken Jhol Momos", image: "/menu/chickern jhol momos.png", price: 180, category: "Momo", isVeg: false, description: "Chicken momos served in spicy sesame soup." },
  { id: 4, name: "Veg Momos", image: "/menu/Veg Momos.png", price: 100, category: "Momo", isVeg: true, description: "Classic steamed vegetable momos." },
  { id: 5, name: "Veg Fry Momos", image: "/menu/Veg fry Momos.png", price: 130, category: "Momo", isVeg: true, description: "Crispy fried vegetable momos." },
  { id: 6, name: "Veg Jhol Momos", image: "/menu/Veg jhol Momos.png", price: 140, category: "Momo", isVeg: true, description: "Steamed veg momos in spicy tangy soup." },

  // --- BIRYANI ---
  { id: 7, name: "Chicken Biryani", image: "/menu/Chicken Biryani.png", price: 250, category: "Biryani", isVeg: false, description: "Aromatic basmati rice cooked with chicken." },
  { id: 8, name: "Mutton Biryani", image: "/menu/Mutton Biryani.png", price: 300, category: "Biryani", isVeg: false, description: "Aromatic basmati rice cooked with tender mutton." },
  { id: 9, name: "Egg Biryani", image: "/menu/egg Biryani.png", price: 200, category: "Biryani", isVeg: false, description: "Fragrant rice cooked with eggs and spices." },
  { id: 10, name: "Veg Biryani", image: "/menu/Veg Biryani.png", price: 200, category: "Biryani", isVeg: true, description: "Fragrant rice cooked with mixed vegetables." },

  // --- BURGER ---
  { id: 11, name: "Cheese Chicken Burger", image: "/menu/Cheese chiken Burger.jpg", price: 180, category: "Burger", isVeg: false, description: "Chicken burger with extra cheese." },
  { id: 12, name: "Chicken Burger", image: "/menu/Chicken Burger.jpg", price: 150, category: "Burger", isVeg: false, description: "Classic chicken patty burger." },
  { id: 13, name: "Chicken Grill Burger", image: "/menu/chicken grill burger.jpg", price: 170, category: "Burger", isVeg: false, description: "Grilled chicken burger loaded with cheese." },
  { id: 14, name: "Veg Burger", image: "/menu/Veg Burger.jpg", price: 120, category: "Burger", isVeg: true, description: "Classic vegetable patty burger." },
  { id: 15, name: "Veg Grill Burger", image: "/menu/veg grill burger.jpg", price: 150, category: "Burger", isVeg: true, description: "Grilled burger loaded with veggies and cheese." },

  // --- PIZZA ---
  { id: 16, name: "Margherita Pizza", image: "/menu/Margherita Pizza.png", price: 199, category: "Pizza", isVeg: true, description: "Classic cheese and tomato pizza." },
  { id: 17, name: "Paneer Pizza", image: "/menu/Paneer Pizza.png", price: 250, category: "Pizza", isVeg: true, description: "Vegetarian pizza loaded with fresh paneer." },
  { id: 18, name: "Veg Pizza", image: "/menu/veg pizza.png", price: 220, category: "Pizza", isVeg: true, description: "Fresh vegetable pizza with mozzarella." },
  { id: 19, name: "Chicken Pizza", image: "/menu/chickern Pizza.jpg", price: 350, category: "Pizza", isVeg: false, description: "Wood-fired pizza topped with roasted chicken." },

  // --- SNACKS ---
  { id: 20, name: "Chicken Wings", image: "/menu/Chicken Wings.png", price: 250, category: "Snacks", isVeg: false, description: "Spicy and tender chicken wings." },
  { id: 21, name: "Chicken Spring Rolls", image: "/menu/chicken Spring Rolls.png", price: 150, category: "Snacks", isVeg: false, description: "Crispy fried rolls stuffed with chicken." },
  { id: 22, name: "French Fries", image: "/menu/French Fries.png", price: 100, category: "Snacks", isVeg: true, description: "Crispy golden french fries." },
  { id: 23, name: "Veg Spring Rolls", image: "/menu/veg Spring Rolls.png", price: 120, category: "Snacks", isVeg: true, description: "Crispy rolls filled with seasoned vegetables." },

  // --- NOODLES (Not explicitly a button, but FOOD items) ---
  { id: 24, name: "Chicken Chowmein", image: "/menu/Chicken Chowmein.png", price: 170, category: "Noodles", isVeg: false, description: "Stir-fried noodles with chicken." },
  { id: 25, name: "Mixed Chowmein", image: "/menu/Mixed Chowmein.png", price: 190, category: "Noodles", isVeg: false, description: "Stir-fried noodles with mixed meats and veggies." },
  { id: 26, name: "Veg Chowmein", image: "/menu/Veg Chowmein.png", price: 140, category: "Noodles", isVeg: true, description: "Stir-fried noodles with mixed fresh vegetables." },

  // --- DRINKS ---
  { id: 27, name: "Coke", image: "/menu/Coke.png", price: 50, category: "Drinks", isVeg: true, description: "Chilled cola." },
  { id: 28, name: "Fanta", image: "/menu/Fanta.png", price: 50, category: "Drinks", isVeg: true, description: "Orange flavored soda." },
  { id: 29, name: "Milkshake", image: "/menu/Milkshake.png", price: 120, category: "Drinks", isVeg: true, description: "Creamy cold milkshake." },
  { id: 30, name: "Pepsi", image: "/menu/Pepsi.png", price: 50, category: "Drinks", isVeg: true, description: "Chilled cola." },
  { id: 31, name: "Sprite", image: "/menu/Sprite.png", price: 50, category: "Drinks", isVeg: true, description: "Lemon-lime soda." },
  { id: 32, name: "Monster", image: "/menu/monster.png", price: 120, category: "Drinks", isVeg: true, description: "Energy drink." },
  { id: 33, name: "Mountain Dew", image: "/menu/mountain dew.png", price: 50, category: "Drinks", isVeg: true, description: "Refreshing cold drink." },
  { id: 34, name: "Red Bull", image: "/menu/redbull.png", price: 120, category: "Drinks", isVeg: true, description: "Energy drink." }
];

const categories = ["All", "Momo", "Biryani", "Burger", "Pizza", "Snacks", "Noodles", "Drinks"];

module.exports = {
  menuData,
  categories
};
