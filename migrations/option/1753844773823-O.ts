import { MigrationInterface, QueryRunner } from 'typeorm';

export class O1753844773823 implements MigrationInterface {
   name = 'O1753844773823';

   public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(
         `CREATE TABLE \`option\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`is_deleted\` tinyint NOT NULL DEFAULT 0, UNIQUE INDEX \`IDX_5e47276c1d6a3fb881283fdbf1\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
   }

   public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP INDEX \`IDX_5e47276c1d6a3fb881283fdbf1\` ON \`option\``);
      await queryRunner.query(`DROP TABLE \`option\``);
   }
}
