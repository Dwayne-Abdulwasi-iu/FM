#!/usr/bin/env node
/**
 * Backfill phone numbers for existing users
 * 
 * This script sets a placeholder phone number for existing users who don't have one.
 * These users will need to update their phone via profile settings and verify with OTP.
 * 
 * Run: node scripts/backfill-phone-numbers.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Finding users without phone numbers using raw query...\n');
  
  // Use raw MongoDB query to find users with null/missing phone
  const usersWithoutPhone = await prisma.$runCommandRaw({
    find: 'users',
    filter: {
      $or: [
        { phone: null },
        { phone: { $exists: false } },
        { phone: '' }
      ]
    },
    projection: {
      _id: 1,
      email: 1,
      name: 1
    }
  });

  const users = usersWithoutPhone.cursor?.firstBatch || [];
  console.log(`Found ${users.length} users without phone numbers.\n`);

  if (users.length === 0) {
    console.log('✅ All users have phone numbers.');
    return;
  }

  // Update each user with a unique placeholder phone
  let counter = 1;
  
  for (const user of users) {
    const placeholderPhone = `+0000000000${counter.toString().padStart(3, '0')}`;
    
    try {
      await prisma.$runCommandRaw({
        update: 'users',
        updates: [
          {
            q: { _id: user._id },
            u: { 
              $set: { 
                phone: placeholderPhone,
                phoneVerified: false 
              } 
            }
          }
        ]
      });
      
      console.log(`✅ ${user.email} -> ${placeholderPhone} (needs verification)`);
      counter++;
    } catch (error) {
      console.error(`❌ Failed to update ${user.email}:`, error.message);
    }
  }

  console.log('\n📧 IMPORTANT: These users will need to:');
  console.log('   1. Go to Profile Settings');
  console.log('   2. Update their phone number');
  console.log('   3. Verify via OTP');
  console.log('\n   Until they verify, they cannot sign in.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
