import { MigrationInterface, QueryRunner } from 'typeorm';

export class O1754379147116 implements MigrationInterface {
   name = 'O1754379147116';

   public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(
         `CREATE TABLE \`order\` (
            \`order_id\` int NOT NULL AUTO_INCREMENT COMMENT 'Unique identifier for the order',
            \`user_id\` int NOT NULL COMMENT 'ID of the user who placed the order',
            \`total_amount\` decimal(12,2) NOT NULL COMMENT 'Final total amount of the order (including taxes/shipping if applicable)',
            \`fullname\` varchar(100) NOT NULL COMMENT 'Full name of the customer',
            \`phone_number\` varchar(20) NOT NULL COMMENT 'Contact phone number',
            \`email\` varchar(100) NOT NULL COMMENT 'Contact email address',
            \`note\` text NULL COMMENT 'Additional notes from the customer',
            \`shipping_address\` varchar(200) NOT NULL COMMENT 'shipping address',
            \`status\` enum ('PENDING', 'COMPLETED', 'CANCELLED') NOT NULL COMMENT 'Order status' DEFAULT 'PENDING',
            \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            \`deleted_at\` datetime(6) NULL,
            \`is_deleted\` tinyint NOT NULL DEFAULT 0,
            PRIMARY KEY (\`order_id\`)
         ) ENGINE=InnoDB`,
      );
   }

   public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP TABLE \`order\``);
   }
}
