import { MigrationInterface, QueryRunner } from "typeorm";

export class P1753864561848 implements MigrationInterface {
    name = 'P1753864561848'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`product\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`description\` text NOT NULL, \`slug\` varchar(255) NOT NULL, \`category_id\` int NOT NULL, \`shop_id\` int NOT NULL, \`thumbnail\` text NULL, \`rating_avg\` decimal(3,2) NOT NULL DEFAULT '0.00', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`is_deleted\` tinyint NOT NULL DEFAULT 0, UNIQUE INDEX \`IDX_8cfaf4a1e80806d58e3dbe6922\` (\`slug\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_8cfaf4a1e80806d58e3dbe6922\` ON \`product\``);
        await queryRunner.query(`DROP TABLE \`product\``);
    }

}
