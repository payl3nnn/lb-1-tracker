const mineflayer = require('mineflayer')

// ================== CONFIG ==================
const MC_HOST = 'play.pika-network.net'
const MC_PORT = 25565
const MC_VERSION = '1.8.9'
const MC_USERNAME = 'Bapplemid153'
const MC_AUTH = 'offline'
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1559021224586256499/2NirW1a6pTwcbZtfAOVu6VxXp9KhGrZZv-R4t5eDTgF-VDNUX3Wk-fg7qvqODzd_kcnH'
const LOGIN_PASSWORD = 'mom9'
// ============================================

const messageQueue = []
let isSending = false
const DISCORD_DELAY = 1300

async function processQueue() {
  if (isSending || messageQueue.length === 0) return
  isSending = true

  while (messageQueue.length > 0) {
    const content = messageQueue.shift()
    try {
      const res = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      if (!res.ok) console.error('Webhook failed:', res.status, await res.text())
    } catch (err) {
      console.error('Failed to send to Discord:', err.message)
    }
    await sleep(DISCORD_DELAY)
  }
  isSending = false
}

function sendToWebhook(content) {
  if (!content?.trim()) return
  const safe = content.length > 1900 ? content.slice(0, 1900) + '...' : content
  messageQueue.push(safe)
  processQueue()
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Wraps links with <> so Discord doesn't show embeds
function wrapLinks(text) {
  // Matches http/https links
  return text.replace(/(https?:\/\/[^\s]+)/g, '<$1>')
}

function createBot() {
  console.log('Connecting to PikaNetwork...')
  const bot = mineflayer.createBot({
    host: MC_HOST,
    port: MC_PORT,
    username: MC_USERNAME,
    auth: MC_AUTH,
    version: MC_VERSION,
    hideErrors: false
  })

  let hasStartedJoin = false

  bot.on('login', () => {
    console.log(`✅ Logged in as ${bot.username}`)
  })

  bot.on('spawn', async () => {
    console.log('✅ Spawned')

    if (hasStartedJoin) return
    hasStartedJoin = true

    await sleep(3000)

    bot.chat(`/login ${LOGIN_PASSWORD}`)
    console.log('Sent /login')
    await sleep(4500)

    await joinBedwarsLobby1(bot)
  })

  bot.on('windowOpen', (window) => {
    console.log(`[GUI] Opened: "${window.title}"`)
  })

  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString().trim()
    if (!text) return

    console.log(`[CHAT] ${text}`)

    // Wrap any links so Discord doesn't show previews
    const finalText = wrapLinks(text)
    sendToWebhook(finalText)
  })

  bot.on('kicked', (reason) => {
    console.log('❌ Kicked:', reason.toString())
    hasStartedJoin = false
    setTimeout(createBot, 15000)
  })

  bot.on('error', (err) => console.error('Error:', err.message))

  bot.on('end', () => {
    console.log('Disconnected. Reconnecting in 15s...')
    hasStartedJoin = false
    setTimeout(createBot, 15000)
  })
}

async function joinBedwarsLobby1(bot) {
  try {
    console.log('=== Starting Bedwars Lobby 1 sequence ===')

    // 1. Open Server Selector (hotbar 5)
    console.log('1. Selecting hotbar slot 5...')
    bot.setQuickBarSlot(4)
    await sleep(1000)
    bot.activateItem()
    console.log('   Right-clicked Server Selector')

    await waitForWindow(bot, 'Server Selector', 15000)
    await sleep(1500)

    // 2. Click Bed (slot 30)
    console.log('2. Clicking slot 30 (Bed)...')
    await clickSlot(bot, 30)
    console.log('   Clicked slot 30')

    console.log('   Waiting for transfer to Bedwars...')
    await sleep(9000)

    // 3. Open Lobby Selector (hotbar 7)
    console.log('3. Selecting hotbar slot 7...')
    bot.setQuickBarSlot(6)
    await sleep(1000)
    bot.activateItem()
    console.log('   Right-clicked Lobby Selector')

    await waitForWindow(bot, 'Lobby Selector', 15000)
    await sleep(1500)

    // 4. Click Lobby 1 (slot 10)
    console.log('4. Clicking slot 10 (Lobby 1)...')
    await clickSlot(bot, 10)
    console.log('   Clicked Lobby 1')

    await sleep(6000)
    console.log('✅ Done! Should be in Bedwars Lobby 1')
  } catch (err) {
    console.error('Failed to join lobby:', err.message)
  }
}

function waitForWindow(bot, titleSubstring, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      bot.removeListener('windowOpen', handler)
      reject(new Error(`Timeout waiting for "${titleSubstring}"`))
    }, timeout)

    function handler(window) {
      const title = window.title || ''
      if (title.includes(titleSubstring)) {
        clearTimeout(timer)
        bot.removeListener('windowOpen', handler)
        resolve(window)
      }
    }
    bot.on('windowOpen', handler)
  })
}

async function clickSlot(bot, slot) {
  if (!bot.currentWindow) {
    throw new Error('No window open to click')
  }
  await bot.clickWindow(slot, 0, 0)
  await sleep(400)
}

createBot()