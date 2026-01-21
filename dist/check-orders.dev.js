"use strict";

/* eslint-disable @typescript-eslint/no-require-imports */
var _require = require('@prisma/client'),
    PrismaClient = _require.PrismaClient;

var p = new PrismaClient();

function checkOrders() {
  var orders;
  return regeneratorRuntime.async(function checkOrders$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _context.next = 3;
          return regeneratorRuntime.awrap(p.order.findMany({
            orderBy: {
              createdAt: 'desc'
            },
            take: 5,
            include: {
              items: true
            }
          }));

        case 3:
          orders = _context.sent;
          console.log('Recent Orders:');
          console.log(JSON.stringify(orders, null, 2));

          if (orders.length === 0) {
            console.log('\n⚠️  No orders found in database!');
            console.log('This means the Paystack webhook is not being triggered.');
            console.log('\nTo fix this for local development, you need either:');
            console.log('1. Use ngrok to expose your localhost to the internet');
            console.log('2. Deploy to a public URL and test there');
            console.log('3. Manually trigger the webhook');
          }

          process.exit(0);
          _context.next = 14;
          break;

        case 10:
          _context.prev = 10;
          _context.t0 = _context["catch"](0);
          console.error('Error:', _context.t0.message);
          process.exit(1);

        case 14:
          _context.prev = 14;
          _context.next = 17;
          return regeneratorRuntime.awrap(p.$disconnect());

        case 17:
          return _context.finish(14);

        case 18:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 10, 14, 18]]);
}

checkOrders();