const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.TOKEN;
const canal = process.env.CANAL;

const app = express();
app.use(express.json());

const bot = new TelegramBot(token);

let estado = {};

// webhook endpoint
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// flujo igual que antes
bot.onText(/\/post/, (msg) => {
  estado[msg.chat.id] = { step: 1 };
  bot.sendMessage(msg.chat.id, "📷 Envía la imagen:");
});

bot.on("message", async (msg) => {
  const user = estado[msg.chat.id];
  if (!user) return;

  if (user.step === 1 && msg.photo) {
    user.photo = msg.photo[msg.photo.length - 1].file_id;
    user.step = 2;
    return bot.sendMessage(msg.chat.id, "📝 Envía el texto:");
  }

  if (user.step === 2 && msg.text) {
    user.caption = msg.text;
    user.step = 3;
    return bot.sendMessage(msg.chat.id, "🔗 Envía el link:");
  }

  if (user.step === 3 && msg.text) {
    const link = msg.text;

    await bot.sendPhoto(canal, user.photo, {
      caption: user.caption,
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔗 Descarga aquí", url: link }],
          [
            { text: "📥 Ver guía", url: "https://t.me/nrcmod/154" },
            { text: "💬 Comentar", url: "https://t.me/nrcmods" }
          ]
        ]
      }
    });

    bot.sendMessage(msg.chat.id, "✅ Publicado");
    delete estado[msg.chat.id];
  }
});

// levantar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log("Servidor iniciado");

  const url = process.env.RENDER_EXTERNAL_URL;

  await bot.setWebHook(`${url}/bot${token}`);
});
