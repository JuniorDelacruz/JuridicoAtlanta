import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken'

const router = express.Router();

// Inicia o login com Discord
router.get('/discord', passport.authenticate('discord'));

// Callback do Discord (após autorizar)
router.get('/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => {
    
    // Gera JWT com os dados do usuário
    const token = jwt.sign(
      { id: req.user.id, discordId: req.user.discordId, role: req.user.role, username: req.user.username, subRole: req.user.subRole },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Redireciona para o frontend com token (ou salva na session)
    res.redirect(`https://juridicoatlanta.starkstore.dev.br//dashboard?token=${token}`);
    // Ou use res.json({ token }) se for API pura
  }
);

// Logout (opcional)
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

export default router;