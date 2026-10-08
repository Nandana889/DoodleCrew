import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'CampusFind API' });
});

import itemRoutes from './routes/items';
import claimRoutes from './routes/claims';

app.use('/api/items', itemRoutes);
app.use('/api/claims', claimRoutes);

export default app;
