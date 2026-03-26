import bcrypt from "bcrypt";
import {
  User,
  Role,
  Permission,
  Category,
  MenuItem,
  DailySpecial,
  Address,
  Cart,
  Order,
  Payment,
  Testimonial,
  MenuItemLike,
  NewsletterSubscriber,
  OAuthAccount,
  RefreshToken,
  AuditLog,
  Reservation,
} from "../models/index.js";

// ── Helpers ─────────────────────────────────────────────────────

const today = new Date();
const daysFromNow = (n: number) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate() + n);
const daysAgo = (n: number) => daysFromNow(-n);

// ── Seed Data ───────────────────────────────────────────────────

export async function seedData(): Promise<void> {
  console.log("🌱 Seeding sample data...");

  // ─── 1. Super Admin + Admin + Staff + Customer Users ──────────
  const adminRole = await Role.findOne({ name: "admin" });
  const staffRole = await Role.findOne({ name: "staff" });
  const customerRole = await Role.findOne({ name: "customer" });
  const riderRole = await Role.findOne({ name: "delivery_rider" });
  const superAdminRole = await Role.findOne({ name: "super_admin" });

  if (!customerRole || !adminRole || !staffRole || !riderRole || !superAdminRole) {
    console.log("⚠️  Roles not found. Run permission & role seeders first.");
    return;
  }

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
  const hashedPassword = await bcrypt.hash("Password123!", saltRounds);

  const usersData = [
    {
      name: "Erica Mensah",
      email: "erica@ericaskitchen.com",
      password: hashedPassword,
      authMethod: "local" as const,
      role: superAdminRole._id,
      phoneNumber: "+233501234567",
      emailVerified: true,
      active: true,
    },
    {
      name: "Kwame Admin",
      email: "admin@ericaskitchen.com",
      password: hashedPassword,
      authMethod: "local" as const,
      role: adminRole._id,
      phoneNumber: "+233501234568",
      emailVerified: true,
      active: true,
    },
    {
      name: "Ama Staff",
      email: "staff@ericaskitchen.com",
      password: hashedPassword,
      authMethod: "local" as const,
      role: staffRole._id,
      phoneNumber: "+233501234569",
      emailVerified: true,
      active: true,
    },
    {
      name: "Kofi Rider",
      email: "rider@ericaskitchen.com",
      password: hashedPassword,
      authMethod: "local" as const,
      role: riderRole._id,
      phoneNumber: "+233501234570",
      emailVerified: true,
      active: true,
    },
    {
      name: "Abena Customer",
      email: "abena@gmail.com",
      password: hashedPassword,
      authMethod: "local" as const,
      role: customerRole._id,
      phoneNumber: "+233201234567",
      emailVerified: true,
      active: true,
    },
    {
      name: "Yaw Customer",
      email: "yaw@gmail.com",
      password: hashedPassword,
      authMethod: "local" as const,
      role: customerRole._id,
      phoneNumber: "+233201234568",
      emailVerified: true,
      active: true,
    },
    {
      name: "Akua Customer",
      email: "akua@gmail.com",
      password: hashedPassword,
      authMethod: "local" as const,
      role: customerRole._id,
      phoneNumber: "+233201234569",
      emailVerified: true,
      active: true,
    },
  ];

  // Use insertMany with rawResult to skip pre-save hooks (password already hashed)
  const users = await User.insertMany(usersData);
  const [erica, kwameAdmin, amaStaff, kofiRider, abena, yaw, akua] = users;

  console.log(`  ✅ ${users.length} users created`);

  // ─── 2. Addresses ─────────────────────────────────────────────
  const addressesData = [
    {
      user: abena._id,
      label: "Home",
      location: "East Legon, Accra",
      landmark: "Near A&C Mall",
      gpsAddress: "GA-457-1234",
      phoneNumber: "+233201234567",
      isDefault: true,
    },
    {
      user: abena._id,
      label: "Office",
      location: "Airport City, Accra",
      landmark: "Near Kotoka Terminal 3",
      phoneNumber: "+233201234567",
      isDefault: false,
    },
    {
      user: yaw._id,
      label: "Home",
      location: "Osu, Oxford Street, Accra",
      landmark: "Near Frankie's",
      phoneNumber: "+233201234568",
      isDefault: true,
    },
    {
      user: akua._id,
      label: "Home",
      location: "Cantonments, Accra",
      landmark: "Near The Kwarleyz Residence",
      gpsAddress: "GA-123-5678",
      phoneNumber: "+233201234569",
      isDefault: true,
    },
  ];

  const addresses = await Address.insertMany(addressesData);

  // Link default addresses to users
  await User.findByIdAndUpdate(abena._id, {
    addresses: [addresses[0]._id, addresses[1]._id],
    defaultAddress: addresses[0]._id,
  });
  await User.findByIdAndUpdate(yaw._id, {
    addresses: [addresses[2]._id],
    defaultAddress: addresses[2]._id,
  });
  await User.findByIdAndUpdate(akua._id, {
    addresses: [addresses[3]._id],
    defaultAddress: addresses[3]._id,
  });

  console.log(`  ✅ ${addresses.length} addresses created`);

  // ─── 3. Categories ────────────────────────────────────────────
  const categoriesData = [
    {
      name: "Popular",
      description: "Hearty Ghanaian and African main courses",
      image: "https://images.unsplash.com/photo-main-dishes.jpg",
      isActive: true,
      sortOrder: 1,
    },
    {
      name: "Locals",
      description: "Traditional Ghanaian soups and stews",
      image: "https://images.unsplash.com/photo-soups.jpg",
      isActive: true,
      sortOrder: 2,
    },
    {
      name: "Continental",
      description: "Jollof, Waakye, fried rice, and more",
      image: "https://images.unsplash.com/photo-rice.jpg",
      isActive: true,
      sortOrder: 3,
    },
    {
      name: "Drinks",
      description: "Grilled meats, chicken, and seafood",
      image: "https://images.unsplash.com/photo-grill.jpg",
      isActive: true,
      sortOrder: 4,
    },
    // {
    //   name: "Sides",
    //   description: "Tasty sides to complement your meal",
    //   image: "https://images.unsplash.com/photo-sides.jpg",
    //   isActive: true,
    //   sortOrder: 5,
    // },
    // {
    //   name: "Beverages",
    //   description: "Refreshing drinks and smoothies",
    //   image: "https://images.unsplash.com/photo-beverages.jpg",
    //   isActive: true,
    //   sortOrder: 6,
    // },
    // {
    //   name: "Desserts",
    //   description: "Sweet treats to finish your meal",
    //   image: "https://images.unsplash.com/photo-desserts.jpg",
    //   isActive: true,
    //   sortOrder: 7,
    // },
  ];

  const categories = await Category.insertMany(categoriesData);
  const [mainDishes, soups, riceDishes, grills, sides, beverages, desserts] =
    categories;

  console.log(`  ✅ ${categories.length} categories created`);

  // ─── 4. Menu Items ────────────────────────────────────────────
  const menuItemsData = [
    // Main Dishes
    {
      name: "Banku with Tilapia",
      description:
        "   Freshly prepared banku served with grilled tilapia, hot pepper sauce, and fresh vegetables",
      price: 65.0,
      category: mainDishes._id,
      images: ["https://images.unsplash.com/photo-banku-tilapia.jpg"],
      preparationTime: 30,
      ingredients: ["Corn dough", "Cassava dough", "Tilapia", "Pepper", "Onions", "Tomatoes"],
      allergens: ["Fish"],
      nutritionalInfo: { calories: 650, protein: 35, carbs: 70, fat: 20 },
      isAvailable: true,
      isFeatured: true,
      likes: 128,
      averageRating: 4.8,
      totalReviews: 42,
      createdBy: erica._id,
    },
    {
      name: "Fufu with Light Soup",
      description:
        "Pounded fufu with aromatic light soup, goat meat, and garden eggs",
      price: 55.0,
      category: mainDishes._id,
      images: ["https://images.unsplash.com/photo-fufu-lightsoup.jpg"],
      preparationTime: 35,
      ingredients: ["Cassava", "Plantain", "Goat meat", "Tomatoes", "Onions", "Pepper"],
      allergens: [],
      nutritionalInfo: { calories: 580, protein: 30, carbs: 75, fat: 15 },
      isAvailable: true,
      isFeatured: true,
      likes: 95,
      averageRating: 4.7,
      totalReviews: 38,
      createdBy: erica._id,
    },
    {
      name: "Kenkey with Fried Fish",
      description:
        "Traditional Ga kenkey with fried fish, shito, and fresh pepper sauce",
      price: 45.0,
      category: mainDishes._id,
      images: ["https://images.unsplash.com/photo-kenkey.jpg"],
      preparationTime: 25,
      ingredients: ["Corn dough", "Fish", "Shito", "Pepper", "Onions"],
      allergens: ["Fish"],
      nutritionalInfo: { calories: 520, protein: 28, carbs: 65, fat: 18 },
      isAvailable: true,
      isFeatured: false,
      likes: 67,
      averageRating: 4.5,
      totalReviews: 22,
      createdBy: erica._id,
    },

    // Soups & Stews
    {
      name: "Groundnut Soup",
      description:
        "Rich peanut soup with your choice of chicken or goat meat, served with fufu or rice balls",
      price: 50.0,
      category: soups._id,
      images: ["https://images.unsplash.com/photo-groundnut-soup.jpg"],
      preparationTime: 40,
      ingredients: ["Groundnut paste", "Chicken", "Tomatoes", "Onions", "Spices"],
      allergens: ["Peanuts"],
      nutritionalInfo: { calories: 520, protein: 30, carbs: 35, fat: 30 },
      isAvailable: true,
      isFeatured: true,
      likes: 82,
      averageRating: 4.6,
      totalReviews: 29,
      createdBy: erica._id,
    },
    {
      name: "Palm Nut Soup",
      description:
        "Traditional palm nut soup with crab, smoked fish, and assorted meats",
      price: 60.0,
      category: soups._id,
      images: ["https://images.unsplash.com/photo-palmnut-soup.jpg"],
      preparationTime: 45,
      ingredients: ["Palm fruit extract", "Crab", "Smoked fish", "Meats", "Spices"],
      allergens: ["Shellfish", "Fish"],
      nutritionalInfo: { calories: 600, protein: 35, carbs: 30, fat: 38 },
      isAvailable: true,
      isFeatured: false,
      likes: 54,
      averageRating: 4.4,
      totalReviews: 18,
      createdBy: erica._id,
    },

    // Rice Dishes
    {
      name: "Jollof Rice",
      description:
        "Ghana's famous jollof rice cooked with tomatoes, spices, and served with chicken",
      price: 45.0,
      category: riceDishes._id,
      images: ["https://images.unsplash.com/photo-jollof.jpg"],
      preparationTime: 25,
      ingredients: ["Rice", "Tomatoes", "Onions", "Chicken", "Spices", "Oil"],
      allergens: [],
      nutritionalInfo: { calories: 550, protein: 25, carbs: 70, fat: 18 },
      isAvailable: true,
      isFeatured: true,
      likes: 210,
      averageRating: 4.9,
      totalReviews: 67,
      createdBy: erica._id,
    },
    {
      name: "Waakye",
      description:
        "Rice and beans cooked with millet leaves, served with shito, spaghetti, egg, and protein of choice",
      price: 40.0,
      category: riceDishes._id,
      images: ["https://images.unsplash.com/photo-waakye.jpg"],
      preparationTime: 20,
      ingredients: ["Rice", "Beans", "Millet leaves", "Spaghetti", "Egg", "Shito"],
      allergens: ["Eggs"],
      nutritionalInfo: { calories: 620, protein: 22, carbs: 80, fat: 20 },
      isAvailable: true,
      isFeatured: false,
      likes: 143,
      averageRating: 4.6,
      totalReviews: 45,
      createdBy: erica._id,
    },
    {
      name: "Fried Rice with Chicken",
      description: "Flavourful fried rice with mixed vegetables and grilled chicken",
      price: 50.0,
      category: riceDishes._id,
      images: ["https://images.unsplash.com/photo-fried-rice.jpg"],
      preparationTime: 20,
      ingredients: ["Rice", "Vegetables", "Chicken", "Soy sauce", "Oil"],
      allergens: ["Soy"],
      nutritionalInfo: { calories: 500, protein: 28, carbs: 60, fat: 16 },
      isAvailable: true,
      isFeatured: false,
      likes: 88,
      averageRating: 4.3,
      totalReviews: 31,
      createdBy: erica._id,
    },

    // Grills & BBQ
    {
      name: "Grilled Chicken (Half)",
      description: "Half chicken marinated with Erica's special spice blend, grilled to perfection",
      price: 55.0,
      category: grills._id,
      images: ["https://images.unsplash.com/photo-grilled-chicken.jpg"],
      preparationTime: 35,
      ingredients: ["Chicken", "Spices", "Onions", "Ginger", "Garlic"],
      allergens: [],
      nutritionalInfo: { calories: 420, protein: 45, carbs: 5, fat: 22 },
      isAvailable: true,
      isFeatured: true,
      likes: 156,
      averageRating: 4.8,
      totalReviews: 52,
      createdBy: erica._id,
    },
    {
      name: "Grilled Tilapia",
      description: "Whole tilapia marinated and grilled with banku and pepper sauce",
      price: 70.0,
      category: grills._id,
      images: ["https://images.unsplash.com/photo-grilled-tilapia.jpg"],
      preparationTime: 30,
      ingredients: ["Tilapia", "Spices", "Pepper", "Onions", "Banku"],
      allergens: ["Fish"],
      nutritionalInfo: { calories: 480, protein: 40, carbs: 30, fat: 18 },
      isAvailable: true,
      isFeatured: false,
      likes: 72,
      averageRating: 4.5,
      totalReviews: 24,
      createdBy: erica._id,
    },

    // Sides
    {
      name: "Kelewele",
      description: "Spicy fried plantain cubes seasoned with ginger and chili",
      price: 15.0,
      category: sides._id,
      images: ["https://images.unsplash.com/photo-kelewele.jpg"],
      preparationTime: 10,
      ingredients: ["Plantain", "Ginger", "Chili", "Oil"],
      allergens: [],
      nutritionalInfo: { calories: 220, protein: 2, carbs: 40, fat: 8 },
      isAvailable: true,
      isFeatured: false,
      likes: 98,
      averageRating: 4.4,
      totalReviews: 35,
      createdBy: erica._id,
    },
    {
      name: "Fried Yam",
      description: "Crispy fried yam chips served with shito and pepper sauce",
      price: 20.0,
      category: sides._id,
      images: ["https://images.unsplash.com/photo-fried-yam.jpg"],
      preparationTime: 15,
      ingredients: ["Yam", "Oil", "Salt"],
      allergens: [],
      nutritionalInfo: { calories: 320, protein: 4, carbs: 55, fat: 12 },
      isAvailable: true,
      isFeatured: false,
      likes: 65,
      averageRating: 4.2,
      totalReviews: 20,
      createdBy: erica._id,
    },

    // Beverages
    {
      name: "Sobolo (Hibiscus Drink)",
      description: "Refreshing chilled hibiscus drink with ginger, cloves, and pineapple",
      price: 12.0,
      category: beverages._id,
      images: ["https://images.unsplash.com/photo-sobolo.jpg"],
      preparationTime: 5,
      ingredients: ["Hibiscus", "Ginger", "Cloves", "Pineapple", "Sugar"],
      allergens: [],
      nutritionalInfo: { calories: 120, protein: 0, carbs: 30, fat: 0 },
      isAvailable: true,
      isFeatured: true,
      likes: 175,
      averageRating: 4.7,
      totalReviews: 60,
      createdBy: erica._id,
    },
    {
      name: "Fresh Mango Smoothie",
      description: "Thick and creamy mango smoothie made with fresh mangoes and yoghurt",
      price: 18.0,
      category: beverages._id,
      images: ["https://images.unsplash.com/photo-mango-smoothie.jpg"],
      preparationTime: 5,
      ingredients: ["Mango", "Yoghurt", "Honey"],
      allergens: ["Milk"],
      nutritionalInfo: { calories: 180, protein: 4, carbs: 38, fat: 3 },
      isAvailable: true,
      isFeatured: false,
      likes: 92,
      averageRating: 4.5,
      totalReviews: 28,
      createdBy: erica._id,
    },

    // Desserts
    {
      name: "Bofrot (Puff Puff)",
      description: "Golden deep-fried dough balls, lightly sweetened and dusted with sugar",
      price: 10.0,
      category: desserts._id,
      images: ["https://images.unsplash.com/photo-bofrot.jpg"],
      preparationTime: 15,
      ingredients: ["Flour", "Sugar", "Yeast", "Nutmeg", "Oil"],
      allergens: ["Gluten"],
      nutritionalInfo: { calories: 280, protein: 4, carbs: 45, fat: 10 },
      isAvailable: true,
      isFeatured: false,
      likes: 110,
      averageRating: 4.3,
      totalReviews: 38,
      createdBy: erica._id,
    },
  ];

  const menuItems = await MenuItem.insertMany(menuItemsData);
  const menuMap = new Map(menuItems.map((m) => [m.name, m]));

  console.log(`  ✅ ${menuItems.length} menu items created`);

  // ─── 5. Daily Specials ────────────────────────────────────────
  const dailySpecialsData = [
    {
      title: "Monday Special — Jollof Feast 🍚",
      description: "Get our award-winning Jollof Rice at 10% off with a free Sobolo!",
      menuItem: menuMap.get("Jollof Rice")!._id,
      date: daysFromNow(0),
      isActive: true,
      sortOrder: 1,
      createdBy: erica._id,
    },
    {
      title: "Grilled Chicken Tuesday 🍗",
      description: "Half grilled chicken with your choice of any side for a set price",
      menuItem: menuMap.get("Grilled Chicken (Half)")!._id,
      date: daysFromNow(1),
      isActive: true,
      sortOrder: 1,
      createdBy: erica._id,
    },
    {
      title: "Fufu Wednesday 🥘",
      description: "Traditional fufu with light soup or groundnut soup — comfort food at its best!",
      menuItem: menuMap.get("Fufu with Light Soup")!._id,
      date: daysFromNow(2),
      isActive: true,
      sortOrder: 1,
      createdBy: erica._id,
    },
  ];

  const dailySpecials = await DailySpecial.insertMany(dailySpecialsData);
  console.log(`  ✅ ${dailySpecials.length} daily specials created`);

  // ─── 6. Testimonials ──────────────────────────────────────────
  const testimonialsData = [
    {
      user: abena._id,
      content:
        "The Jollof Rice here is absolutely incredible! Best I've had in Accra. The flavour is authentic and the chicken is always perfectly grilled. 10/10!",
      rating: 5,
      menuItem: menuMap.get("Jollof Rice")!._id,
      isApproved: true,
      isFeatured: true,
      approvedBy: kwameAdmin._id,
    },
    {
      user: yaw._id,
      content:
        "I've been ordering the Banku with Tilapia every weekend for 3 months. The pepper sauce is a game changer. Delivery is always on time too!",
      rating: 5,
      menuItem: menuMap.get("Banku with Tilapia")!._id,
      isApproved: true,
      isFeatured: true,
      approvedBy: kwameAdmin._id,
    },
    {
      user: akua._id,
      content:
        "Great variety of traditional Ghanaian food. The Groundnut Soup tastes just like my grandmother's recipe. Will definitely be coming back!",
      rating: 4,
      menuItem: menuMap.get("Groundnut Soup")!._id,
      isApproved: true,
      isFeatured: false,
      approvedBy: kwameAdmin._id,
    },
    {
      user: abena._id,
      content:
        "Love the Sobolo! So refreshing, especially in this Accra heat. Perfect with any meal. The Kelewele is also addictive!",
      rating: 5,
      menuItem: menuMap.get("Sobolo (Hibiscus Drink)")!._id,
      isApproved: true,
      isFeatured: true,
      approvedBy: kwameAdmin._id,
    },
    {
      user: yaw._id,
      content:
        "Good food overall. The Waakye portion could be a bit larger for the price, but the taste is spot on. Shito is amazing!",
      rating: 4,
      menuItem: menuMap.get("Waakye")!._id,
      isApproved: true,
      isFeatured: false,
      approvedBy: kwameAdmin._id,
    },
  ];

  const testimonials = await Testimonial.insertMany(testimonialsData);
  console.log(`  ✅ ${testimonials.length} testimonials created`);

  // ─── 7. Menu Item Likes ───────────────────────────────────────
  const likesData = [
    { user: abena._id, menuItem: menuMap.get("Jollof Rice")!._id },
    { user: abena._id, menuItem: menuMap.get("Sobolo (Hibiscus Drink)")!._id },
    { user: abena._id, menuItem: menuMap.get("Grilled Chicken (Half)")!._id },
    { user: yaw._id, menuItem: menuMap.get("Banku with Tilapia")!._id },
    { user: yaw._id, menuItem: menuMap.get("Jollof Rice")!._id },
    { user: yaw._id, menuItem: menuMap.get("Waakye")!._id },
    { user: akua._id, menuItem: menuMap.get("Groundnut Soup")!._id },
    { user: akua._id, menuItem: menuMap.get("Fufu with Light Soup")!._id },
    { user: akua._id, menuItem: menuMap.get("Kelewele")!._id },
  ];

  const likes = await MenuItemLike.insertMany(likesData);
  console.log(`  ✅ ${likes.length} menu item likes created`);

  // ─── 8. Orders ────────────────────────────────────────────────
  const ordersData = [
    {
      orderNumber: "EK-20260301-0001",
      user: abena._id,
      items: [
        {
          menuItem: menuMap.get("Jollof Rice")!._id,
          name: "Jollof Rice",
          quantity: 2,
          unitPrice: 45.0,
          lineTotal: 90.0,
        },
        {
          menuItem: menuMap.get("Grilled Chicken (Half)")!._id,
          name: "Grilled Chicken (Half)",
          quantity: 1,
          unitPrice: 55.0,
          lineTotal: 55.0,
        },
        {
          menuItem: menuMap.get("Sobolo (Hibiscus Drink)")!._id,
          name: "Sobolo (Hibiscus Drink)",
          quantity: 2,
          unitPrice: 12.0,
          lineTotal: 24.0,
        },
      ],
      deliveryAddress: {
        location: "East Legon, Accra",
        landmark: "Near A&C Mall",
        phoneNumber: "+233201234567",
      },
      deliveryFee: 10.0,
      subtotal: 169.0,
      tax: 0,
      totalAmount: 179.0,
      status: "delivered",
      statusHistory: [
        { status: "pending", changedAt: daysAgo(2) },
        { status: "confirmed", changedBy: amaStaff._id, changedAt: daysAgo(2) },
        { status: "preparing", changedBy: amaStaff._id, changedAt: daysAgo(2) },
        { status: "ready_for_pickup", changedBy: amaStaff._id, changedAt: daysAgo(2) },
        { status: "out_for_delivery", changedBy: kofiRider._id, changedAt: daysAgo(2) },
        { status: "delivered", changedBy: kofiRider._id, changedAt: daysAgo(2) },
      ],
      paymentMethod: "mobile_money",
      paymentStatus: "success",
      assignedRider: kofiRider._id,
      deliveredAt: daysAgo(2),
      createdAt: daysAgo(2),
    },
    {
      orderNumber: "EK-20260302-0001",
      user: yaw._id,
      items: [
        {
          menuItem: menuMap.get("Banku with Tilapia")!._id,
          name: "Banku with Tilapia",
          quantity: 1,
          unitPrice: 65.0,
          lineTotal: 65.0,
        },
        {
          menuItem: menuMap.get("Kelewele")!._id,
          name: "Kelewele",
          quantity: 1,
          unitPrice: 15.0,
          lineTotal: 15.0,
        },
      ],
      deliveryAddress: {
        location: "Osu, Oxford Street, Accra",
        landmark: "Near Frankie's",
        phoneNumber: "+233201234568",
      },
      deliveryFee: 8.0,
      subtotal: 80.0,
      tax: 0,
      totalAmount: 88.0,
      status: "delivered",
      statusHistory: [
        { status: "pending", changedAt: daysAgo(1) },
        { status: "confirmed", changedBy: amaStaff._id, changedAt: daysAgo(1) },
        { status: "preparing", changedBy: amaStaff._id, changedAt: daysAgo(1) },
        { status: "ready_for_pickup", changedBy: amaStaff._id, changedAt: daysAgo(1) },
        { status: "out_for_delivery", changedBy: kofiRider._id, changedAt: daysAgo(1) },
        { status: "delivered", changedBy: kofiRider._id, changedAt: daysAgo(1) },
      ],
      paymentMethod: "card",
      paymentStatus: "success",
      assignedRider: kofiRider._id,
      deliveredAt: daysAgo(1),
      createdAt: daysAgo(1),
    },
    {
      orderNumber: "EK-20260303-0001",
      user: akua._id,
      items: [
        {
          menuItem: menuMap.get("Fufu with Light Soup")!._id,
          name: "Fufu with Light Soup",
          quantity: 2,
          unitPrice: 55.0,
          lineTotal: 110.0,
        },
        {
          menuItem: menuMap.get("Fresh Mango Smoothie")!._id,
          name: "Fresh Mango Smoothie",
          quantity: 2,
          unitPrice: 18.0,
          lineTotal: 36.0,
        },
      ],
      deliveryAddress: {
        location: "Cantonments, Accra",
        landmark: "Near The Kwarleyz Residence",
        phoneNumber: "+233201234569",
      },
      deliveryFee: 10.0,
      subtotal: 146.0,
      tax: 0,
      totalAmount: 156.0,
      status: "preparing",
      statusHistory: [
        { status: "pending", changedAt: new Date() },
        { status: "confirmed", changedBy: amaStaff._id, changedAt: new Date() },
        { status: "preparing", changedBy: amaStaff._id, changedAt: new Date() },
      ],
      paymentMethod: "mobile_money",
      paymentStatus: "success",
      createdAt: new Date(),
    },
    {
      orderNumber: "EK-20260303-0002",
      user: abena._id,
      items: [
        {
          menuItem: menuMap.get("Groundnut Soup")!._id,
          name: "Groundnut Soup",
          quantity: 1,
          unitPrice: 50.0,
          lineTotal: 50.0,
        },
        {
          menuItem: menuMap.get("Fried Yam")!._id,
          name: "Fried Yam",
          quantity: 1,
          unitPrice: 20.0,
          lineTotal: 20.0,
        },
      ],
      deliveryAddress: {
        location: "East Legon, Accra",
        landmark: "Near A&C Mall",
        phoneNumber: "+233201234567",
      },
      deliveryFee: 10.0,
      subtotal: 70.0,
      tax: 0,
      totalAmount: 80.0,
      status: "pending",
      statusHistory: [{ status: "pending", changedAt: new Date() }],
      paymentMethod: "cash_on_delivery",
      paymentStatus: "pending",
      createdAt: new Date(),
    },
  ];

  const orders = await Order.insertMany(ordersData);
  console.log(`  ✅ ${orders.length} orders created`);

  // ─── 9. Payments ──────────────────────────────────────────────
  const paymentsData = [
    {
      order: orders[0]._id,
      user: abena._id,
      amount: 179.0,
      currency: "GHS",
      method: "mobile_money",
      provider: "MTN MoMo",
      providerRef: "MOMO-2026030100001",
      status: "success",
      paidAt: daysAgo(2),
      createdAt: daysAgo(2),
    },
    {
      order: orders[1]._id,
      user: yaw._id,
      amount: 88.0,
      currency: "GHS",
      method: "card",
      provider: "Paystack",
      providerRef: "PSK-2026030200001",
      status: "success",
      paidAt: daysAgo(1),
      createdAt: daysAgo(1),
    },
    {
      order: orders[2]._id,
      user: akua._id,
      amount: 156.0,
      currency: "GHS",
      method: "mobile_money",
      provider: "MTN MoMo",
      providerRef: "MOMO-2026030300001",
      status: "success",
      paidAt: new Date(),
      createdAt: new Date(),
    },
  ];

  const payments = await Payment.insertMany(paymentsData);
  console.log(`  ✅ ${payments.length} payments created`);

  // ─── 10. Carts (active carts for some users) ─────────────────
  const cartsData = [
    {
      user: yaw._id,
      items: [
        {
          menuItem: menuMap.get("Grilled Tilapia")!._id,
          quantity: 1,
          unitPrice: 70.0,
          addedAt: new Date(),
        },
        {
          menuItem: menuMap.get("Kelewele")!._id,
          quantity: 2,
          unitPrice: 15.0,
          addedAt: new Date(),
        },
      ],
      totalAmount: 100.0,
    },
  ];

  const carts = await Cart.insertMany(cartsData);
  console.log(`  ✅ ${carts.length} carts created`);

  // ─── 11. Reservations ─────────────────────────────────────────
  const reservationsData = [
    {
      reservationNumber: "RES-20260303-0001",
      user: abena._id,
      guestName: "Abena Customer",
      guestEmail: "abena@gmail.com",
      guestPhone: "+233201234567",
      date: daysFromNow(2),
      time: "19:00",
      partySize: 4,
      status: "confirmed",
      specialRequests: "Window seat preferred. Celebrating a birthday!",
      confirmedBy: amaStaff._id,
    },
    {
      reservationNumber: "RES-20260303-0002",
      guestName: "Kwesi Appiah",
      guestEmail: "kwesi@gmail.com",
      guestPhone: "+233551234567",
      date: daysFromNow(3),
      time: "12:30",
      partySize: 2,
      status: "pending",
      specialRequests: "Quiet corner please",
    },
    {
      reservationNumber: "RES-20260303-0003",
      user: yaw._id,
      guestName: "Yaw Customer",
      guestEmail: "yaw@gmail.com",
      guestPhone: "+233201234568",
      date: daysFromNow(5),
      time: "18:00",
      partySize: 8,
      tableNumber: 5,
      status: "confirmed",
      specialRequests: "Corporate dinner. Need projector if possible.",
      confirmedBy: kwameAdmin._id,
    },
    {
      reservationNumber: "RES-20260301-0001",
      guestName: "Efua Sharma",
      guestPhone: "+233241234567",
      date: daysAgo(2),
      time: "20:00",
      partySize: 6,
      status: "completed",
    },
  ];

  const reservations = await Reservation.insertMany(reservationsData);
  console.log(`  ✅ ${reservations.length} reservations created`);

  // ─── 12. Newsletter Subscribers ───────────────────────────────
  const subscribersData = [
    { email: "abena@gmail.com", isActive: true, subscribedAt: daysAgo(30) },
    { email: "yaw@gmail.com", isActive: true, subscribedAt: daysAgo(20) },
    { email: "akua@gmail.com", isActive: true, subscribedAt: daysAgo(15) },
    { email: "foodie@gmail.com", isActive: true, subscribedAt: daysAgo(10) },
    { email: "accrafood@gmail.com", isActive: true, subscribedAt: daysAgo(5) },
    {
      email: "unsubscribed@gmail.com",
      isActive: false,
      subscribedAt: daysAgo(25),
      unsubscribedAt: daysAgo(3),
    },
  ];

  const subscribers = await NewsletterSubscriber.insertMany(subscribersData);
  console.log(`  ✅ ${subscribers.length} newsletter subscribers created`);

  // ─── 13. Audit Logs ───────────────────────────────────────────
  const auditLogsData = [
    {
      actor: erica._id,
      action: "auth.signup",
      resource: "user",
      resourceId: erica._id,
      status: "success" as const,
      createdAt: daysAgo(30),
    },
    {
      actor: abena._id,
      action: "auth.signup",
      resource: "user",
      resourceId: abena._id,
      status: "success" as const,
      createdAt: daysAgo(14),
    },
    {
      actor: abena._id,
      action: "order.create",
      resource: "order",
      resourceId: orders[0]._id,
      status: "success" as const,
      createdAt: daysAgo(2),
    },
    {
      actor: yaw._id,
      action: "order.create",
      resource: "order",
      resourceId: orders[1]._id,
      status: "success" as const,
      createdAt: daysAgo(1),
    },
    {
      actor: kwameAdmin._id,
      action: "reservation.confirm",
      resource: "reservation",
      resourceId: reservations[0]._id,
      status: "success" as const,
      createdAt: daysAgo(1),
    },
  ];

  const auditLogs = await AuditLog.insertMany(auditLogsData);
  console.log(`  ✅ ${auditLogs.length} audit logs created`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 All sample data seeded successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Test accounts (password: Password123!):");
  console.log("  • Super Admin: erica@ericaskitchen.com");
  console.log("  • Admin:       admin@ericaskitchen.com");
  console.log("  • Staff:       staff@ericaskitchen.com");
  console.log("  • Rider:       rider@ericaskitchen.com");
  console.log("  • Customer:    abena@gmail.com");
  console.log("  • Customer:    yaw@gmail.com");
  console.log("  • Customer:    akua@gmail.com");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

export default seedData;
