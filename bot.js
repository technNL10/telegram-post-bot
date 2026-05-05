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
  bot.sendMessage(msg.chat.id, "📌 Copia el mensaje que quieres publicar ");
});

// recibir mensaje original
bot.on("message", async (msg) => {
  const user = estado[msg.chat.id];
  if (!user) return;

  // Paso 1: guardar mensaje original
  if (user.step === 1 && (msg.text || msg.photo || msg.document || msg.video)) {
    user.original_chat = msg.chat.id;
    user.original_message_id = msg.message_id;
    user.step = 2;
    return bot.sendMessage(msg.chat.id, "Envía el link principal para el botón    🔗 Descargar aquí");
  }

  // Paso 2: recibir link para botón principal
  if (user.step === 2 && msg.text) {
    user.link = msg.text;
    user.guia = "https://t.me/nrcmod/154";
    user.comentarios = "https://t.me/nrcmods";
    user.step = 3;

    // mostrar preview con botones
    await bot.copyMessage(msg.chat.id, user.original_chat, user.original_message_id, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔗 Descargar aquí", url: user.link }],
          [
            { text: "📘 Ayuda", url: user.guia },
            { text: "💬 Comentar", url: user.comentarios }
          ],
          [
            { text: "✅ Publicar", callback_data: "publicar" },
            { text: "❌ Cancelar", callback_data: "cancelar" }
          ]
        ]
      }
    });

    return bot.sendMessage(msg.chat.id, "👆 Vista previa. Confirma:");
  }
});

// manejar botones
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const user = estado[chatId];
  if (!user) return;

  if (query.data === "publicar") {
    try {
      // copiar mensaje original al canal con los botones definitivos
      await bot.copyMessage(canal, user.original_chat, user.original_message_id, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔗 Descargar aquí", url: user.link }],
            [
              { text: "📘 Ayuda", url: user.guia },
              { text: "💬 Comentar", url: user.comentarios }
            ]
          ]
        }
      });

      await bot.answerCallbackQuery(query.id, { text: "Publicado ✅" });
      await bot.sendMessage(chatId, "✅ Publicado en el canal");

      // borrar preview
      await bot.deleteMessage(chatId, query.message.message_id);

    } catch (err) {
      console.log(err);
      await bot.answerCallbackQuery(query.id, { text: "Error ❌", show_alert: true });
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

// levantar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log("Servidor iniciado");

  const url = process.env.RENDER_EXTERNAL_URL;
  await bot.setWebHook(`${url}/bot${token}`);
});
