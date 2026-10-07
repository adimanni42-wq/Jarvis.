import express from "express";
import cors from "cors";
import mineflayer from "mineflayer";

const app = express();

app.use(cors());
app.use(express.json());

let bot = null;

let botState = {
  connected: false,
  host: null,
  port: null,
  username: null,
  message: "Not connected"
};


// ================================
// BASIC STATUS
// ================================

app.get("/", (req, res) => {
  res.json({
    name: "JARVIS Backend",
    status: "online",
    minecraft: botState
  });
});


app.get("/api/status", (req, res) => {
  res.json(botState);
});


// ================================
// MINECRAFT JOIN
// ================================

app.post("/api/minecraft/join", async (req, res) => {

  const {
    host,
    port = 25565,
    username = "JARVIS_Bot"
  } = req.body || {};

  if (!host) {
    return res.status(400).json({
      error: "Server address is required."
    });
  }


  // Disconnect existing bot
  if (bot) {

    try {
      bot.quit("Switching server");
    } catch {}

    bot = null;
  }


  botState = {
    connected: false,
    host,
    port: Number(port),
    username,
    message: "Connecting..."
  };


  try {

    bot = mineflayer.createBot({

      host: host,

      port: Number(port),

      username: username,

      auth: "offline"

    });


    // Bot successfully logs in
    bot.once("login", () => {

      botState.connected = true;

      botState.message =
        "Connected to " +
        host +
        ":" +
        port;

      console.log(
        "JARVIS connected to " +
        host +
        ":" +
        port
      );

    });


    // Bot disconnects
    bot.on("end", () => {

      botState.connected = false;

      botState.message =
        "Minecraft bot disconnected.";

      bot = null;

      console.log(
        "JARVIS Minecraft bot disconnected."
      );

    });


    // Minecraft error
    bot.on("error", (error) => {

      botState.connected = false;

      botState.message =
        error?.message ||
        "Minecraft connection error.";

      console.log(
        "Minecraft error:",
        error?.message
      );

    });


    res.json({

      ok: true,

      connected: false,

      message:
        "Minecraft connection started."

    });


  } catch (error) {

    bot = null;

    botState.connected = false;

    botState.message =
      error?.message ||
      "Unable to connect.";

    res.status(500).json({

      error:
        error?.message ||
        "Unable to connect."

    });

  }

});


// ================================
// MINECRAFT LEAVE
// ================================

app.post("/api/minecraft/leave", (req, res) => {

  if (bot) {

    try {
      bot.quit("JARVIS disconnect");
    } catch {}

    bot = null;
  }


  botState = {

    connected: false,

    host: null,

    port: null,

    username: null,

    message: "Not connected"

  };


  res.json({

    ok: true,

    message:
      "Minecraft bot disconnected."

  });

});


// ================================
// SEND MINECRAFT CHAT
// ================================

app.post("/api/minecraft/chat", (req, res) => {

  if (!bot || !botState.connected) {

    return res.status(409).json({

      error:
        "Minecraft bot is not connected."

    });

  }


  const message =
    String(
      req.body?.message || ""
    ).slice(0, 256);


  if (!message) {

    return res.status(400).json({

      error:
        "Message is required."

    });

  }


  bot.chat(message);


  res.json({

    ok: true,

    message:
      "Minecraft message sent."

  });

});


// ================================
// JARVIS AI CHAT
// ================================

app.post("/api/chat", async (req, res) => {

  const message =
    String(
      req.body?.message || ""
    ).trim();


  if (!message) {

    return res.status(400).json({

      error:
        "Message is required."

    });

  }


  // No OpenAI key yet
  if (!process.env.OPENAI_API_KEY) {

    return res.json({

      reply:
        "I received your command. Add OPENAI_API_KEY to the Railway environment variables to enable my full AI system."

    });

  }


  try {

    const response =
      await fetch(
        "https://api.openai.com/v1/responses",
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

            "Authorization":
              "Bearer " +
              process.env.OPENAI_API_KEY

          },

          body: JSON.stringify({

            model:
              process.env.OPENAI_MODEL ||
              "gpt-5-mini",

            input: [

              {

                role: "system",

                content:
                  "You are JARVIS, a futuristic personal AI assistant. Be helpful, concise, and natural. Never claim that you performed an action unless the system actually performed it."

              },

              {

                role: "user",

                content:
                  message

              }

            ]

          })

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      console.log(
        "OpenAI error:",
        data
      );

      return res.status(500).json({

        error:
          "AI service returned an error."

      });

    }


    const reply =
      data.output_text ||
      "I could not generate a response.";


    res.json({

      reply

    });


  } catch (error) {

    console.log(
      "AI request failed:",
      error
    );

    res.status(500).json({

      error:
        "AI request failed."

    });

  }

});


// ================================
// START SERVER
// ================================

const PORT =
  process.env.PORT || 3000;


app.listen(
  PORT,
  () => {

    console.log(
      "JARVIS backend listening on port " +
      PORT
    );

  }
);
