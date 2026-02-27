import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

async function hashPassword(password) {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt.toString('hex')}.${derivedKey.toString('hex')}`;
}

const password = process.argv[2] || 'demo123';

hashPassword(password).then(hash => {
  console.log(hash);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
