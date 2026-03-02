import Order from "../models/orderModel.js";
import Payment from "../models/paymentModel.js";
import User from "../models/userModel.js";
import MenuItem from "../models/menuItemModel.js";
import Testimonial from "../models/testimonialModel.js";
import Reservation from "../models/reservationModel.js";
import AuditLog from "../models/auditLogModel.js";
import Role from "../models/roleModel.js";

// ── Dashboard Overview ──────────────────────────────────────────
// Returns all the top-level KPI cards shown in the admin dashboard

export const getDashboardOverview = async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalSalesResult,
    ordersToday,
    reservationsToday,
    reviewStats,
    monthlyStats,
    totalOrders,
    totalReservationsMonth,
    newCustomersMonth,
  ] = await Promise.all([
    // Total sales this month
    Payment.aggregate([
      { $match: { status: "success", paidAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    // Orders placed today
    Order.countDocuments({ createdAt: { $gte: todayStart, $lt: todayEnd } }),

    // Reservations today
    Reservation.countDocuments({
      date: { $gte: todayStart, $lt: todayEnd },
      status: { $nin: ["cancelled", "no_show"] },
    }),

    // Average customer rating
    Testimonial.aggregate([
      { $match: { isApproved: true } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]),

    // Monthly sales for the statistics panel
    Payment.aggregate([
      { $match: { status: "success", paidAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    // Total orders this month
    Order.countDocuments({ createdAt: { $gte: monthStart } }),

    // Total reservations this month
    Reservation.countDocuments({
      date: { $gte: monthStart },
      status: { $nin: ["cancelled", "no_show"] },
    }),

    // New customers this month
    (async () => {
      const customerRole = await Role.findOne({ name: "customer" });
      if (!customerRole) return 0;
      return User.countDocuments({
        role: customerRole._id,
        createdAt: { $gte: monthStart },
      });
    })(),
  ]);

  return {
    overview: {
      totalSales: totalSalesResult[0]?.total ?? 0,
      ordersToday,
      reservationsToday,
      customerReviews: {
        average: Number((reviewStats[0]?.averageRating ?? 0).toFixed(1)),
        total: reviewStats[0]?.totalReviews ?? 0,
      },
    },
    restaurantStatistics: {
      monthlySales: monthlyStats[0]?.total ?? 0,
      totalOrders,
      reservations: totalReservationsMonth,
      newCustomers: newCustomersMonth,
    },
  };
};

// ── Revenue Chart (line chart data) ─────────────────────────────
// Returns daily revenue for the current or specified month

export const getRevenueChart = async (
  year?: number,
  month?: number,
): Promise<{ date: string; revenue: number }[]> => {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1; // 1-indexed
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);

  const pipeline = await Payment.aggregate([
    { $match: { status: "success", paidAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
        revenue: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { date: "$_id", revenue: 1, _id: 0 } },
  ]);

  return pipeline;
};

// ── Sales Analytics ─────────────────────────────────────────────
// Detailed sales breakdown with period comparison

export const getSalesAnalytics = async (
  period: "today" | "week" | "month" | "year" = "month",
) => {
  const now = new Date();
  let currentStart: Date;
  let previousStart: Date;
  let previousEnd: Date;

  switch (period) {
    case "today":
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      previousStart = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
      previousEnd = currentStart;
      break;
    case "week":
      currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      previousStart = new Date(
        currentStart.getTime() - 7 * 24 * 60 * 60 * 1000,
      );
      previousEnd = currentStart;
      break;
    case "year":
      currentStart = new Date(now.getFullYear(), 0, 1);
      previousStart = new Date(now.getFullYear() - 1, 0, 1);
      previousEnd = currentStart;
      break;
    default: // month
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEnd = currentStart;
      break;
  }

  const [currentSales, previousSales, salesByMethod, topSellingItems] =
    await Promise.all([
      Payment.aggregate([
        { $match: { status: "success", paidAt: { $gte: currentStart } } },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
            avgOrder: { $avg: "$amount" },
          },
        },
      ]),

      Payment.aggregate([
        {
          $match: {
            status: "success",
            paidAt: { $gte: previousStart, $lt: previousEnd },
          },
        },
        {
          $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } },
        },
      ]),

      // Sales breakdown by payment method
      Payment.aggregate([
        { $match: { status: "success", paidAt: { $gte: currentStart } } },
        {
          $group: {
            _id: "$method",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),

      // Top selling items this period
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: currentStart },
            status: { $ne: "cancelled" },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.menuItem",
            name: { $first: "$items.name" },
            totalQuantity: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.lineTotal" },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 },
      ]),
    ]);

  const currentTotal = currentSales[0]?.total ?? 0;
  const previousTotal = previousSales[0]?.total ?? 0;
  const growthRate =
    previousTotal > 0
      ? Number(
          (((currentTotal - previousTotal) / previousTotal) * 100).toFixed(1),
        )
      : currentTotal > 0
        ? 100
        : 0;

  return {
    current: {
      totalRevenue: currentTotal,
      transactionCount: currentSales[0]?.count ?? 0,
      averageOrderValue: Number((currentSales[0]?.avgOrder ?? 0).toFixed(2)),
    },
    previous: {
      totalRevenue: previousTotal,
      transactionCount: previousSales[0]?.count ?? 0,
    },
    growthRate,
    salesByMethod: salesByMethod.map((s) => ({
      method: s._id,
      total: s.total,
      count: s.count,
    })),
    topSellingItems,
  };
};

// ── Order Analytics ─────────────────────────────────────────────

export const getOrderAnalytics = async (
  period: "today" | "week" | "month" | "year" = "month",
) => {
  const now = new Date();
  let start: Date;

  switch (period) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  const [statusBreakdown, ordersByDay, avgFulfillmentTime, peakHours] =
    await Promise.all([
      // Order status distribution
      Order.aggregate([
        { $match: { createdAt: { $gte: start } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Orders per day
      Order.aggregate([
        { $match: { createdAt: { $gte: start } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", count: 1, revenue: 1, _id: 0 } },
      ]),

      // Average fulfillment time (pending → delivered) in minutes
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start },
            status: "delivered",
            deliveredAt: { $exists: true },
          },
        },
        {
          $project: {
            fulfillmentMinutes: {
              $divide: [{ $subtract: ["$deliveredAt", "$createdAt"] }, 60000],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgMinutes: { $avg: "$fulfillmentMinutes" },
            minMinutes: { $min: "$fulfillmentMinutes" },
            maxMinutes: { $max: "$fulfillmentMinutes" },
          },
        },
      ]),

      // Peak order hours
      Order.aggregate([
        { $match: { createdAt: { $gte: start } } },
        { $group: { _id: { $hour: "$createdAt" }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 24 },
        { $project: { hour: "$_id", count: 1, _id: 0 } },
        { $sort: { hour: 1 } },
      ]),
    ]);

  const total = statusBreakdown.reduce(
    (sum: number, s: { count: number }) => sum + s.count,
    0,
  );
  const cancelledCount =
    statusBreakdown.find((s: { _id: string }) => s._id === "cancelled")
      ?.count ?? 0;
  const deliveredCount =
    statusBreakdown.find((s: { _id: string }) => s._id === "delivered")
      ?.count ?? 0;

  return {
    totalOrders: total,
    completedOrders: deliveredCount,
    cancelledOrders: cancelledCount,
    cancellationRate:
      total > 0 ? Number(((cancelledCount / total) * 100).toFixed(1)) : 0,
    completionRate:
      total > 0 ? Number(((deliveredCount / total) * 100).toFixed(1)) : 0,
    statusBreakdown: statusBreakdown.map(
      (s: { _id: string; count: number }) => ({
        status: s._id,
        count: s.count,
        percentage:
          total > 0 ? Number(((s.count / total) * 100).toFixed(1)) : 0,
      }),
    ),
    ordersByDay,
    fulfillmentTime: {
      avgMinutes: Number((avgFulfillmentTime[0]?.avgMinutes ?? 0).toFixed(0)),
      minMinutes: Number((avgFulfillmentTime[0]?.minMinutes ?? 0).toFixed(0)),
      maxMinutes: Number((avgFulfillmentTime[0]?.maxMinutes ?? 0).toFixed(0)),
    },
    peakHours,
  };
};

// ── Customer Analytics ──────────────────────────────────────────

export const getCustomerAnalytics = async (
  period: "week" | "month" | "year" = "month",
) => {
  const now = new Date();
  let start: Date;

  switch (period) {
    case "week":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  const customerRole = await Role.findOne({ name: "customer" });
  const customerRoleId = customerRole?._id;

  const [
    totalCustomers,
    newCustomers,
    activeCustomers,
    customerGrowth,
    topCustomers,
    customerRetention,
  ] = await Promise.all([
    // Total registered customers
    User.countDocuments({ role: customerRoleId, active: true }),

    // New customers in period
    User.countDocuments({
      role: customerRoleId,
      createdAt: { $gte: start },
    }),

    // Customers who placed an order in the period
    Order.distinct("user", { createdAt: { $gte: start } }).then(
      (ids) => ids.length,
    ),

    // Customer signups per day
    User.aggregate([
      { $match: { role: customerRoleId, createdAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", count: 1, _id: 0 } },
    ]),

    // Top customers by spend
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start },
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: "$user",
          totalSpent: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          userId: "$user._id",
          name: "$user.name",
          email: "$user.email",
          totalSpent: 1,
          orderCount: 1,
        },
      },
    ]),

    // Repeat customers (ordered more than once in period)
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start },
          status: { $ne: "cancelled" },
        },
      },
      { $group: { _id: "$user", orderCount: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          totalBuyers: { $sum: 1 },
          repeatBuyers: {
            $sum: { $cond: [{ $gt: ["$orderCount", 1] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const totalBuyers = customerRetention[0]?.totalBuyers ?? 0;
  const repeatBuyers = customerRetention[0]?.repeatBuyers ?? 0;

  return {
    totalCustomers,
    newCustomers,
    activeCustomers,
    retentionRate:
      totalBuyers > 0
        ? Number(((repeatBuyers / totalBuyers) * 100).toFixed(1))
        : 0,
    repeatCustomers: repeatBuyers,
    customerGrowth,
    topCustomers,
  };
};

// ── Menu Performance Analytics ──────────────────────────────────

export const getMenuPerformance = async (
  limit = 20,
  period: "week" | "month" | "year" = "month",
) => {
  const now = new Date();
  let start: Date;

  switch (period) {
    case "week":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  const [topByRevenue, topByQuantity, categoryPerformance, lowPerformers] =
    await Promise.all([
      // Top menu items by revenue
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start },
            status: { $ne: "cancelled" },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.menuItem",
            name: { $first: "$items.name" },
            totalRevenue: { $sum: "$items.lineTotal" },
            totalQuantity: { $sum: "$items.quantity" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: limit },
      ]),

      // Top by quantity sold
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start },
            status: { $ne: "cancelled" },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.menuItem",
            name: { $first: "$items.name" },
            totalQuantity: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.lineTotal" },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: limit },
      ]),

      // Revenue by category
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start },
            status: { $ne: "cancelled" },
          },
        },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "menuitems",
            localField: "items.menuItem",
            foreignField: "_id",
            as: "menuItemData",
          },
        },
        { $unwind: "$menuItemData" },
        {
          $lookup: {
            from: "categories",
            localField: "menuItemData.category",
            foreignField: "_id",
            as: "categoryData",
          },
        },
        { $unwind: "$categoryData" },
        {
          $group: {
            _id: "$categoryData._id",
            name: { $first: "$categoryData.name" },
            totalRevenue: { $sum: "$items.lineTotal" },
            totalQuantity: { $sum: "$items.quantity" },
          },
        },
        { $sort: { totalRevenue: -1 } },
      ]),

      // Lowest performers (items with fewest or no orders)
      MenuItem.aggregate([
        { $match: { isAvailable: true } },
        {
          $lookup: {
            from: "orders",
            let: { itemId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $gte: ["$createdAt", start] },
                  status: { $ne: "cancelled" },
                },
              },
              { $unwind: "$items" },
              { $match: { $expr: { $eq: ["$items.menuItem", "$$itemId"] } } },
              { $group: { _id: null, total: { $sum: "$items.quantity" } } },
            ],
            as: "orderData",
          },
        },
        {
          $project: {
            name: 1,
            price: 1,
            category: 1,
            likes: 1,
            totalOrdered: {
              $ifNull: [{ $arrayElemAt: ["$orderData.total", 0] }, 0],
            },
          },
        },
        { $sort: { totalOrdered: 1 } },
        { $limit: 10 },
      ]),
    ]);

  return {
    topByRevenue,
    topByQuantity,
    categoryPerformance,
    lowPerformers,
  };
};

// ── Recent Activity Feed ────────────────────────────────────────

export const getRecentActivity = async (limit = 20) => {
  const [recentOrders, recentReservations, recentAuditLogs] = await Promise.all(
    [
      Order.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("orderNumber status totalAmount createdAt user")
        .populate("user", "name")
        .lean(),

      Reservation.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select(
          "reservationNumber guestName date time partySize status createdAt",
        )
        .lean(),

      AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("action resource resourceId actor createdAt status")
        .populate("actor", "name")
        .lean(),
    ],
  );

  // Merge and sort all activities by timestamp
  type ActivityItem = {
    type: string;
    title: string;
    description: string;
    timestamp: Date;
    data: Record<string, unknown>;
  };

  const activities: ActivityItem[] = [];

  for (const o of recentOrders) {
    activities.push({
      type: "order",
      title: `New Order #${o.orderNumber}`,
      description: `Order placed - GHS ${o.totalAmount.toFixed(2)}`,
      timestamp: o.createdAt,
      data: { orderId: o._id, status: o.status },
    });
  }

  for (const r of recentReservations) {
    activities.push({
      type: "reservation",
      title: "Table Reservation",
      description: `${r.guestName} - Table for ${r.partySize} at ${r.time}`,
      timestamp: r.createdAt,
      data: {
        reservationId: r._id,
        status: r.status,
        date: r.date,
      },
    });
  }

  for (const a of recentAuditLogs) {
    activities.push({
      type: "audit",
      title: `${a.action}`,
      description: `${a.resource} ${a.action}`,
      timestamp: a.createdAt,
      data: {
        logId: a._id,
        resource: a.resource,
        actor: a.actor,
      },
    });
  }

  activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return activities.slice(0, limit);
};

// ── Reservation Analytics ───────────────────────────────────────

export const getReservationAnalytics = async (
  period: "today" | "week" | "month" = "month",
) => {
  const now = new Date();
  let start: Date;

  switch (period) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  const [
    statusBreakdown,
    reservationsByDay,
    avgPartySize,
    peakTimes,
    noShowRate,
  ] = await Promise.all([
    Reservation.aggregate([
      { $match: { date: { $gte: start } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    Reservation.aggregate([
      { $match: { date: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          count: { $sum: 1 },
          totalGuests: { $sum: "$partySize" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", count: 1, totalGuests: 1, _id: 0 } },
    ]),

    Reservation.aggregate([
      {
        $match: {
          date: { $gte: start },
          status: { $nin: ["cancelled", "no_show"] },
        },
      },
      { $group: { _id: null, avgSize: { $avg: "$partySize" } } },
    ]),

    Reservation.aggregate([
      {
        $match: {
          date: { $gte: start },
          status: { $nin: ["cancelled", "no_show"] },
        },
      },
      { $group: { _id: "$time", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { time: "$_id", count: 1, _id: 0 } },
    ]),

    Reservation.aggregate([
      { $match: { date: { $gte: start } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          noShows: {
            $sum: { $cond: [{ $eq: ["$status", "no_show"] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const total = statusBreakdown.reduce(
    (sum: number, s: { count: number }) => sum + s.count,
    0,
  );
  const totalForRate = noShowRate[0]?.total ?? 0;

  return {
    total,
    statusBreakdown: statusBreakdown.map(
      (s: { _id: string; count: number }) => ({
        status: s._id,
        count: s.count,
        percentage:
          total > 0 ? Number(((s.count / total) * 100).toFixed(1)) : 0,
      }),
    ),
    reservationsByDay,
    averagePartySize: Number((avgPartySize[0]?.avgSize ?? 0).toFixed(1)),
    peakTimes,
    noShowRate:
      totalForRate > 0
        ? Number(
            (((noShowRate[0]?.noShows ?? 0) / totalForRate) * 100).toFixed(1),
          )
        : 0,
  };
};
