import { MigrationInterface, QueryRunner } from 'typeorm';

export class OV1753856016421 implements MigrationInterface {
   name = 'OV1753856016421';

   public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(
         `CREATE TABLE \`option_value\` (\`id\` int NOT NULL AUTO_INCREMENT, \`option_id\` int NOT NULL, \`value\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
   }

   public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP TABLE \`option_value\``);
   }
}
