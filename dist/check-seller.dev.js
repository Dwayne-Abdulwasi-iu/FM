"use strict";

/* eslint-disable @typescript-eslint/no-require-imports */
var _require = require('@prisma/client'),
    PrismaClient = _require.PrismaClient;

var p = new PrismaClient();
p.sellerAccount.findMany().then(function (accounts) {
  console.log('Seller Accounts:');
  console.log(JSON.stringify(accounts, null, 2));
  process.exit(0);
})["catch"](function (e) {
  console.error('Error:', e.message);
  process.exit(1);
});