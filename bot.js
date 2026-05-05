const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.TOKEN;
const canal = process.env.CANAL;

const app = express();
app.use(express.json());

const bot = new TelegramBot(token);

let estado = {};

// webhook
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// iniciar flujo
bot.onText(/\/post/, (msg) => {
  estado[msg.chat.id] = { step: 1 };
  bot.sendMessage(msg.chat.id, "📷 Envía la imagen:");
});

// flujo principal
bot.on("message", async (msg) => {
  const user = estado[msg.chat.id];
  if (!user) return;

  // Paso 1: imagen
  if (user.step === 1 && msg.photo) {
    user.photo = msg.photo[msg.photo.length - 1].file_id;
    user.step = 2;
    return bot.sendMessage(msg.chat.id, "📝 Envía el texto (puedes usar cita):");
  }

  // Paso 2: texto con entities (CLAVE)
  if (user.step === 2 && msg.text) {
    user.caption = msg.text;
    user.entities = msg.entities || []; // 👈 AQUÍ se guarda la cita
    user.step = 3;
    return bot.sendMessage(msg.chat.id, "🔗 Envía el link:");
  }

  // Paso 3: link → preview
  if (user.step === 3 && msg.text) {
    user.link = msg.text;
    user.step = 4;

    await bot.sendPhoto(msg.chat.id, user.photo, {
      caption: user.caption,
      caption_entities: user.entities, // 👈 mantiene cita en preview
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔗 Descarga aquí", url: user.link }],
          [
            { text: "📥 Ver guía", url: "https://t.me/nrcmod/154" },
            { text: "💬 Comentar", url: "https://t.me/nrcmods" }
          ],
          [
            { text: "✅ Publicar", callback_data: "publicar" },
            { text: "❌ Cancelar", callback_data: "cancelar" }
          ]
        ]
      }
    });

    bot.sendMessage(msg.chat.id, "👆 Vista previa. Confirma:");
  }
});

// botones
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const user = estado[chatId];

  if (!user) {
    return bot.answerCallbackQuery(query.id, {
      text: "❌ Sin datos",
      show_alert: true
    });
  }

  if (query.data === "publicar") {
    try {
      await bot.sendPhoto(canal, user.photo, {
        caption: user.caption,
        caption_entities: user.entities, // 👈 CLAVE para mantener cita
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔗 Descarga aquí", url: user.link }],
            [
              { text: "📥 Ver guía", url: "https://t.me/nrcmod/154" },
              { text: "💬 Comentar", url: "https://t.me/nrcmods" }
            ]
          ]
        }
      });

      await bot.answerCallbackQuery(query.id, { text: "Publicado ✅" });
      await bot.sendMessage(chatId, "✅ Publicado en el canal");

      await bot.deleteMessage(chatId, query.message.message_id);

    } catch (err) {
      console.log(err);
      await bot.answerCallbackQuery(query.id, {
        text: "Error ❌",
        show_alert: true
      });
    }

    delete estado[chatId];
  }

  if (query.data === "cancelar") {
    delete estado[chatId];

    await bot.answerCallbackQuery(query.id, { text: "Cancelado ❌" });
    await bot.sendMessage(chatId, "❌ Post cancelado");

    await bot.deleteMessage(chatId, query.message.message_id);
  }
});

// servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log("Servidor iniciado");

  const url = process.env.RENDER_EXTERNAL_URL;
  await bot.setWebHook(`${url}/bot${token}`);
});
