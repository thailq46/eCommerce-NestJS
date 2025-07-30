import { MigrationInterface, QueryRunner } from 'typeorm';

export class PVOV1753863899217 implements MigrationInterface {
   name = 'PVOV1753863899217';

   public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(
         `CREATE TABLE \`product_variant_option_value\` (\`product_variant_id\` int NOT NULL, \`option_value_id\` int NOT NULL, PRIMARY KEY (\`product_variant_id\`, \`option_value_id\`)) ENGINE=InnoDB`,
      );
   }

   public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP TABLE \`product_variant_option_value\``);
   }
}
