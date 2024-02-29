import express from 'express';
import cors from 'cors';
import sql from './sql.js';
import { init_db } from './db.js';

await init_db().catch(() => {
  console.error(`Server setup failed`);
  process.exit(1);
});

const app = express();

app.use(cors());

app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Server is running',
  });
});

app.use('/sql', sql);

app.listen(8035, () => {
  console.log('Server started at http://127.0.0.1:8035');
});
