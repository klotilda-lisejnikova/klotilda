import bcrypt from 'bcrypt';
import { createCore, generateId } from '@eleansphere/be-core';
import { validateFields } from '@eleansphere/schema';
import { adminUserEntity } from '@klotilda/domain';
import { buildAppConfig } from '../app-config';
import { loadEnvFile, readEnvironment, requireVariable } from '../env';

const BCRYPT_ROUNDS = 10;

/**
 * Creates an admin account, or resets the password of the account with that e-mail. Reads
 * SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD.
 */
async function seedAdmin(): Promise<void> {
  loadEnvFile();
  const email = requireVariable(process.env, 'SEED_ADMIN_EMAIL');
  const password = requireVariable(process.env, 'SEED_ADMIN_PASSWORD');

  const issues = validateFields(
    adminUserEntity.config.fields,
    { email, password },
    { mode: 'create' }
  );
  if (issues.length > 0) throw new Error(`Invalid admin account: ${JSON.stringify(issues)}`);

  const core = await createCore(buildAppConfig(readEnvironment()));
  try {
    const AdminUser = core.models[adminUserEntity.config.name];
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const existing = await AdminUser.findOne({ where: { email } });
    if (existing) {
      await existing.update({ password: passwordHash });
      console.info(`Reset the password of ${email}`);
    } else {
      await AdminUser.create({
        id: generateId(adminUserEntity.config.prefix),
        email,
        password: passwordHash,
      });
      console.info(`Created admin ${email}`);
    }
  } finally {
    await core.close();
  }
}

seedAdmin().catch((err: unknown) => {
  console.error('Seeding the admin failed:', err);
  process.exitCode = 1;
});
