import { MigrationInterface, QueryRunner } from 'typeorm';

export class PV1753862890535 implements MigrationInterface {
   name = 'PV1753862890535';

   public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(
         `CREATE TABLE \`product_variant\` (\`id\` int NOT NULL AUTO_INCREMENT, \`product_id\` int NOT NULL, \`sku\` varchar(150) NOT NULL, \`price\` decimal(10,2) NOT NULL DEFAULT '0.00', \`stock\` int NOT NULL DEFAULT '0', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`is_deleted\` tinyint NOT NULL DEFAULT 0, UNIQUE INDEX \`IDX_f4dc2c0888b66d547c175f090e\` (\`sku\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
   }

   public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP INDEX \`IDX_f4dc2c0888b66d547c175f090e\` ON \`product_variant\``);
      await queryRunner.query(`DROP TABLE \`product_variant\``);
   }
}
