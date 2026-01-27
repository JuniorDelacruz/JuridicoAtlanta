import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import passport from './config/passport.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js'
import session from 'express-session';
import requerimentosRoutes from './routes/requerimentosRoutes.js'
import cartorioRoutes from './routes/cartorioRoutes.js'

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Middlewares
app.use(cors());
app.use(express.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET || 'uma_chave_secreta_muito_longa_aqui', // mude isso!
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24, // 1 dia (ajuste conforme quiser)
            secure: process.env.NODE_ENV === 'production', // true em prod com HTTPS
            httpOnly: true,
        },
    })
);


app.use(passport.initialize());
app.use(passport.session()); // se usar session (opcional para JWT puro)


// Conexão com PostgreSQL via Sequelize
let sequelize;

if (process.env.DATABASE_URL) {
    // Para deploy (ex: Railway, Supabase, Neon) – usa a string completa
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false, // importante para hosts gratuitos
            },
        },
        logging: false,
    });
} else {
    // Para local (usa variáveis separadas do .env)
    sequelize = new Sequelize({
        dialect: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        logging: false,
    });
}

try {
    await sequelize.authenticate();
    console.log('PostgreSQL conectado com sucesso!');
} catch (err) {
    console.error('Erro ao conectar PostgreSQL:', err);
}


app.use('/api/auth', authRoutes);
app.use('/api/requerimentos', requerimentosRoutes);
app.use('/api/triagem', requerimentosRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cartorio', cartorioRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
// Rotas de teste
app.get('/api', (req, res) => {
    res.json({ message: 'API Jurídico Atlanta rodando (ESM mode)' });
});



// Servir front-end em produção (depois do build)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(process.cwd(), '../frontend/dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(process.cwd(), '../frontend/dist', 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} → http://localhost:${PORT}`);
});

// Exporta para usar em outros arquivos (ex: models, rotas)
export { app, sequelize };