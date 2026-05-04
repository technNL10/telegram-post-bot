const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TOKEN;
const canal = process.env.CANAL;

const bot = new TelegramBot(token, { polling: true });

let estado = {};

bot.onText(/\/post/, (msg) => {
  estado[msg.chat.id] = { step: 1 };
  bot.sendMessage(msg.chat.id, "📷 Envía la imagen:");
});

bot.on("message", async (msg) => {
  const user = estado[msg.chat.id];
  if (!user) return;

  // Paso 1: imagen
  if (user.step === 1 && msg.photo) {
    user.photo = msg.photo[msg.photo.length - 1].file_id;
    user.step = 2;
    return bot.sendMessage(msg.chat.id, "📝 Envía el texto:");
  }

  // Paso 2: texto
  if (user.step === 2 && msg.text) {
    user.caption = msg.text;
    user.step = 3;
    return bot.sendMessage(msg.chat.id, "🔗 Envía el link:");
  }

  // Paso 3: link
  if (user.step === 3 && msg.text) {
    const link = msg.text;

    try {
      await bot.sendPhoto(canal, user.photo, {
        caption: user.caption,
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔗 Descarga aquí", url: link }],
            [
              { text: "📥 Cómo descargar", url: "https://t.me/nrcmod/154" },
              { text: "💬 Comentar", url: "https://t.me/nrcmods" }
            ]
          ]
        }
      });

      bot.sendMessage(msg.chat.id, "✅ Publicado");
    } catch (e) {
      console.log(e);
      bot.sendMessage(msg.chat.id, "❌ Error");
    }

    delete estado[msg.chat.id];
  }
});
