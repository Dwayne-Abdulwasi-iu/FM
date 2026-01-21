"use strict";

/* eslint-disable @typescript-eslint/no-require-imports */
var _require = require('@prisma/client'),
    PrismaClient = _require.PrismaClient;

function main() {
  var prisma, requests, users;
  return regeneratorRuntime.async(function main$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          prisma = new PrismaClient();
          _context.prev = 1;
          _context.next = 4;
          return regeneratorRuntime.awrap(prisma.commissionRequest.findMany({
            select: {
              id: true,
              status: true,
              designerId: true,
              designerName: true,
              title: true,
              requesterId: true,
              requesterName: true
            }
          }));

        case 4:
          requests = _context.sent;
          console.log('Commission Requests:', JSON.stringify(requests, null, 2));
          _context.next = 8;
          return regeneratorRuntime.awrap(prisma.user.findMany({
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }));

        case 8:
          users = _context.sent;
          console.log('Users:', JSON.stringify(users, null, 2));

        case 10:
          _context.prev = 10;
          _context.next = 13;
          return regeneratorRuntime.awrap(prisma.$disconnect());

        case 13:
          return _context.finish(10);

        case 14:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[1,, 10, 14]]);
}

main();