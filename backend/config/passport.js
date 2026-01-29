// backend/config/passport.js
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import db from '../models/index.js'; 
const { User, CadastroCidadao } = db;
import dotenv from 'dotenv';
import { where } from 'sequelize';
dotenv.config();
passport.use(

    new DiscordStrategy(

        {
            clientID: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            callbackURL: process.env.DISCORD_CALLBACK_URL || 'https://apijuridico.starkstore.dev.br/api/auth/discord/callback',
            scope: ['identify'], // adicione 'email' ou 'guilds' se precisar
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Procura usuário pelo discordId
                let user = await User.findOne({ where: { discordId: profile.id } });

                if (!user) {
                    // Cria novo usuário se não existir
                    user = await User.create({
                        discordId: profile.id,
                        username: profile.username,
                        // discriminator: profile.discriminator, // se quiser a tag #0001
                        avatar: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : null,
                        role: 'cidadao', // default; pode mudar para lógica baseada em roles do servidor
                        subRole: null
                    });
                }
  

                return done(null, user, );
            } catch (err) {
                return done(err);
            }
        }
    )
);

// Serialização (necessário para sessions)
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findByPk(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

export default passport;