import {index,integer,sqliteTable,text} from 'drizzle-orm/sqlite-core';
export const blueprintShares=sqliteTable('blueprint_shares',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),
 name:text('name').notNull(),blockCount:integer('block_count').notNull(),
 snapshot:text('snapshot').notNull(),createdAt:text('created_at').notNull(),
},table=>[index('idx_blueprint_shares_owner_created').on(table.ownerId,table.createdAt)]);
