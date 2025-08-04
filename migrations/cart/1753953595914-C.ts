import { MigrationInterface, QueryRunner } from "typeorm";

export class C1753953595914 implements MigrationInterface {
    name = 'C1753953595914'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`cart\` (\`cart_id\` int NOT NULL AUTO_INCREMENT, \`user_id\` int NOT NULL, \`product_id\` int NOT NULL, \`product_variant_id\` int NOT NULL, \`price\` decimal(10,2) NOT NULL DEFAULT '0.00', \`quantity\` int NOT NULL DEFAULT '0', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (\`cart_id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`cart\``);
    }

}
