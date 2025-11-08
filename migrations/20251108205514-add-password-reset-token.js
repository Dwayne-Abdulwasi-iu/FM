module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Create collection for password reset tokens (if it doesn't exist)
    const colName = 'password_reset_tokens';
    const collections = await db.listCollections({ name: colName }).toArray();
    if (collections.length === 0) {
      await db.createCollection(colName);
    }

    // Unique index on token
    await db.collection(colName).createIndex({ token: 1 }, { unique: true });

    // Index on userId for quick lookup
    await db.collection(colName).createIndex({ userId: 1 });

    // TTL index on expiresAt (expire immediately after the timestamp)
    // expireAfterSeconds: 0 makes documents expire at the time in expiresAt
    await db.collection(colName).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Drop the collection created in up (safe for rollback during development)
    const colName = 'password_reset_tokens';
    const collections = await db.listCollections({ name: colName }).toArray();
    if (collections.length > 0) {
      await db.collection(colName).drop();
    }
  }
};
