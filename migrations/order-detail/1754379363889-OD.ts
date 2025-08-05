import { MigrationInterface, QueryRunner } from 'typeorm';

export class OD1754379363889 implements MigrationInterface {
   name = 'OD1754379363889';

   public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(
         `CREATE TABLE \`order_detail\` (
            \`id\` int NOT NULL AUTO_INCREMENT,
            \`order_id\` int NOT NULL COMMENT 'Reference to the order',
            \`product_id\` int NOT NULL COMMENT 'Reference to the product',
            \`product_variant_id\` int NOT NULL COMMENT 'Reference to the product SKU/variant',
            \`quantity\` int NOT NULL COMMENT 'Quantity of the product ordered',
            \`price\` decimal(12,2) NOT NULL COMMENT 'Unit price at the time of order',
            \`sub_total\` decimal(12,2) NOT NULL COMMENT 'Calculated field: quantity * price',
            \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            \`deleted_at\` datetime(6) NULL,
            \`is_deleted\` tinyint NOT NULL DEFAULT 0,
            PRIMARY KEY (\`id\`)
         ) ENGINE=InnoDB`,
      );
   }

   public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP TABLE \`order_detail\``);
   }
}
