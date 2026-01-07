-- AlterTable
CREATE SEQUENCE clientcategory_id_seq;
ALTER TABLE "ClientCategory" ALTER COLUMN "id" SET DEFAULT nextval('clientcategory_id_seq');
ALTER SEQUENCE clientcategory_id_seq OWNED BY "ClientCategory"."id";

-- AlterTable
CREATE SEQUENCE clientcompany_id_seq;
ALTER TABLE "ClientCompany" ALTER COLUMN "id" SET DEFAULT nextval('clientcompany_id_seq');
ALTER SEQUENCE clientcompany_id_seq OWNED BY "ClientCompany"."id";

-- AlterTable
CREATE SEQUENCE contact_id_seq;
ALTER TABLE "Contact" ALTER COLUMN "id" SET DEFAULT nextval('contact_id_seq');
ALTER SEQUENCE contact_id_seq OWNED BY "Contact"."id";

-- AlterTable
CREATE SEQUENCE opportunity_id_seq;
ALTER TABLE "Opportunity" ALTER COLUMN "id" SET DEFAULT nextval('opportunity_id_seq');
ALTER SEQUENCE opportunity_id_seq OWNED BY "Opportunity"."id";

-- AlterTable
CREATE SEQUENCE user_id_seq;
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT nextval('user_id_seq'),
ALTER COLUMN "isActive" SET DEFAULT true;
ALTER SEQUENCE user_id_seq OWNED BY "User"."id";
