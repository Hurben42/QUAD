// Next reads .env.local; dotenv/config only reads .env. Load both, .env.local first (it wins).
import { config } from 'dotenv';
config({ path: '.env.local' });
config();
