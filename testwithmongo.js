require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { MongoClient } = require('mongodb');

const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;

if (!BOT_TOKEN) throw new Error('Missing BOT_TOKEN in environment.');
if (!MONGODB_URI) throw new Error('Missing MONGODB_URI in environment.');

const bot = new Telegraf(BOT_TOKEN);

// MongoDB client
const client = new MongoClient(MONGODB_URI, { useUnifiedTopology: true });
let db;

// Hardcoded admin Telegram IDs (replace with actual IDs)
const adminList = [' 7771662696', '987654321'];

// Users and bot state (in-memory cache, synced with MongoDB)
let users = {};
let botState = { active: true };

// Detailed hobbies list
const HOBBIES = [
  '☕ Coffee lover',
  '💃 Dancing ',
  '🎤 Singing ',
  '🎮 Gaming ',
  '🎲 Chess / Dominoes / Gebeta ',
  '👩🍳 Cooking ',
  '🍷 Wine / Beer tasting ',
  '🍪 Baking ',
  '✍️ Writing ',
  '🎨 Drawing / Painting ',
  '📸 Photography ',
  '✂️ Fashion ',
  '📚 Reading ',
  '🗣️ Learning languages ',
  '🎙️ Podcasting / YouTube ',
  '⚽ Football fanatic ',
  '🏋️ Gym / Fitness ',
  '🏃 Running ',
  '🎵 Music ',
  '🎭 Comedy ',
  '✈️ Travel dreams ',
  '🌱 Urban gardening ',
  '🎧 Vinyl / Cassette collecting ',
  '🔮 Astrology / Tarot reading ',
];

const LOCATIONS = ['Addis Ababa', 'Mekelle', 'Hawassa', 'Gonder', 'Adama'];
const PLATFORMS = [
  { key: 'telegram', label: 'Telegram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'x', label: 'X (Twitter)' },
  { key: 'other', label: 'Other' },
];

// Ice breakers pool
const ICE_BREAKERS = [
  "Hey! What's your favorite Ethiopian coffee preparation?",
  "If you could visit any place in Ethiopia tomorrow, where would it be?",
  "What's your go-to song for dancing Eskista?",
  "What's a hobby you've always wanted to try?",
  "Tell me about your dream travel destination!",
];
function getIceBreaker() {
  return ICE_BREAKERS[Math.floor(Math.random() * ICE_BREAKERS.length)];
}

// MongoDB functions
async function connectToMongoDB() {
  try {
    await client.connect();
    db = client.db('lovematchbot');
    console.log('Connected to MongoDB');
    await loadUsers();
    await loadBotState();
  } catch (e) {
    console.error('Failed to connect to MongoDB:', e);
    process.exit(1);
  }
}

async function loadUsers() {
  try {
    const userDocs = await db.collection('users').find().toArray();
    users = {};
    userDocs.forEach(doc => {
      users[doc.id] = doc;
    });
  } catch (e) {
    console.error('Failed to load users from MongoDB:', e);
    users = {};
  }
}

async function saveUsers() {
  try {
    const bulk = db.collection('users').initializeUnorderedBulkOp();
    for (const user of Object.values(users)) {
      bulk.find({ id: user.id }).upsert().updateOne({ $set: user });
    }
    if (bulk.length > 0) await bulk.execute();
  } catch (e) {
    console.error('Failed to save users to MongoDB:', e);
  }
}

async function loadBotState() {
  try {
    const stateDoc = await db.collection('botState').findOne({ key: 'state' });
    botState = stateDoc ? stateDoc.state : { active: true };
  } catch (e) {
    console.error('Failed to load bot state from MongoDB:', e);
    botState = { active: true };
  }
}

async function saveBotState() {
  try {
    await db.collection('botState').updateOne(
      { key: 'state' },
      { $set: { state: botState } },
      { upsert: true }
    );
  } catch (e) {
    console.error('Failed to save bot state to MongoDB:', e);
  }
}

// Main menu keyboard
function mainMenuKeyboard(user) {
  const buttons = [
    ['👀 See matches'],
    ['👤 Show profile', '✏️ Edit profile'],
    ['🗑️ Delete profile'],
    ['💬 Help']
  ];
  if (adminList.includes(user.id.toString())) {
    buttons.push(['🛠️ Admin panel']);
  }
  return Markup.keyboard(buttons).resize();
}

// Admin panel keyboard
function adminPanelKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📋 List Users', 'admin_list_users')],
    [Markup.button.callback('🗑️ Delete User', 'admin_delete_user')],
    [Markup.button.callback('📢 Send Announcement', 'admin_send_announcement')],
    [Markup.button.callback('💬 Send Message to User', 'admin_send_message')],
    [Markup.button.callback('📊 View Stats', 'admin_view_stats')],
    [Markup.button.callback(`🤖 Bot: ${botState.active ? 'ON' : 'OFF'}`, 'admin_toggle_bot')],
    [Markup.button.callback('❌ Exit Admin Panel', 'admin_exit')],
  ]);
}

// Hobby selection keyboard
function getHobbyKeyboard(selected = []) {
  return Markup.inlineKeyboard(
    [
      ...HOBBIES.map((hobby) => [
        Markup.button.callback(
          selected.includes(hobby) ? `✅ ${hobby}` : `🏷️ ${hobby}`,
          `toggle_hobby_${hobby.replace(/[^\w]/g, '')}`
        ),
      ]),
      [Markup.button.callback('Other...', 'hobby_other')],
      [Markup.button.callback('Done', 'hobbies_done')],
      [Markup.button.callback('💬 Help', 'help_inline')],
    ]
  );
}

// Edit profile menu keyboard
function editProfileKeyboard(user) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(`📝 Name: ${user.name || ''}`, 'edit_name')],
    [Markup.button.callback(`📍 Location: ${user.location || ''}`, 'edit_location')],
    [Markup.button.callback(`🏷️ Hobbies: ${(user.hobbies || []).join(', ') || 'None'}`, 'edit_hobbies')],
    [Markup.button.callback('💡 Bio', 'edit_bio')],
    [Markup.button.callback('📸 Profile picture', 'edit_photo')],
    [Markup.button.callback(
      `🔗 Username: ${user.custom_username || user.username || ''} (${user.username_platform_label || user.username_platform || ''})`,
      'edit_user_platform')],
    [Markup.button.callback('❌ Cancel', 'edit_cancel')],
    [Markup.button.callback('✅ Done', 'edit_done')],
    [Markup.button.callback('💬 Help', 'help_inline')],
  ]);
}

function validateAge(age) {
  return typeof age === 'number' && age >= 16 && age <= 45;
}
function validateString(input) {
  return typeof input === 'string' && input.trim().length > 1;
}

// Find matches
function findMatches(me, location) {
  return Object.values(users).filter(
    (u) =>
      u.step === 'DONE' &&
      u.gender !== me.gender &&
      u.gender &&
      validateAge(u.age) &&
      (location === null || u.location === location)
  );
}

function formatMatchCaption(match) {
  return `👤 Name: ${match.name}` +
    (match.age_visible !== false ? `\n🎂 Age: ${match.age}` : '') +
    `\n📍 Location: ${match.location}
🏷️ Hobbies: ${Array.isArray(match.hobbies) ? match.hobbies.join(', ') : match.hobbies || 'None'}
💡 Bio: ${match.bio}`;
}

function sendMatchSummary(ctx, match) {
  const caption = formatMatchCaption(match);
  const replyMarkup = Markup.inlineKeyboard([
    [Markup.button.callback('📞 See contact', `reveal_contact_${match.id}`)],
    [Markup.button.callback('💬 Ice breaker', `ice_breaker_${match.id}`)],
    [Markup.button.callback('💬 Help', 'help_inline')],
  ]);
  if (match.photo) {
    return ctx.replyWithPhoto(match.photo, { caption, ...replyMarkup });
  }
  return ctx.reply(caption, replyMarkup);
}

// Match history reset logic
function getTodayDateStr() {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString().split('T')[0];
}
function resetUserMatchHistory(user) {
  user.matchHistory = {
    date: getTodayDateStr(),
    ids: []
  };
}
function getUserMatchHistory(user) {
  if (!user.matchHistory || user.matchHistory.date !== getTodayDateStr()) {
    resetUserMatchHistory(user);
  }
  return user.matchHistory;
}
function addToMatchHistory(user, matchId) {
  const history = getUserMatchHistory(user);
  if (!history.ids.includes(matchId)) history.ids.push(matchId);
  user.matchHistory = history;
  saveUsers();
}

// Bot control command
bot.command('botcontrol', async (ctx) => {
  const userId = ctx.from.id.toString();
  if (!adminList.includes(userId)) {
    return ctx.reply('❌ You are not authorized to control the bot.');
  }
  botState.active = !botState.active;
  await saveBotState();
  ctx.reply(`🤖 Bot is now ${botState.active ? 'ON' : 'OFF'}.`);
  ctx.reply('🛠️ Admin Panel:', adminPanelKeyboard());
});

// Admin panel: Telegram-based
bot.command('admin', async (ctx) => {
  const userId = ctx.from.id.toString();
  if (!adminList.includes(userId)) {
    return ctx.reply('❌ You are not authorized to access the admin panel. Your Telegram ID is not in the admin list.');
  }
  users[userId] = users[userId] || { id: userId, step: 'DONE', hobbies: [] };
  users[userId].adminStep = 'ADMIN_PANEL';
  await saveUsers();
  return ctx.reply('🛠️ Welcome to the Admin Panel! Choose an action:', adminPanelKeyboard());
});

bot.action('admin_list_users', async (ctx) => {
  ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  if (!adminList.includes(userId)) return ctx.reply('❌ Unauthorized.');
  await loadUsers(); // Refresh users from MongoDB
  const userList = Object.values(users)
    .map(u => `ID: ${u.id}\nName: ${u.name || 'N/A'}\nGender: ${u.gender || 'N/A'}\nAge: ${u.age_visible !== false ? u.age || 'N/A' : 'Hidden'}\nLocation: ${u.location || 'N/A'}\nHobbies: ${(u.hobbies || []).join(', ') || 'None'}`)
    .join('\n\n');
  await ctx.reply(userList || 'No users found.');
  await ctx.reply('🛠️ Admin Panel:', adminPanelKeyboard());
});

bot.action('admin_delete_user', async (ctx) => {
  ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  if (!adminList.includes(userId)) return ctx.reply('❌ Unauthorized.');
  users[userId].adminStep = 'ADMIN_DELETE_USER';
  await saveUsers();
  ctx.reply('🗑️ Enter the user ID to delete:');
});

bot.action('admin_send_announcement', async (ctx) => {
  ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  if (!adminList.includes(userId)) return ctx.reply('❌ Unauthorized.');
  users[userId].adminStep = 'ADMIN_SEND_ANNOUNCEMENT';
  await saveUsers();
  ctx.reply('📢 Enter the announcement message to send to all users:');
});

bot.action('admin_send_message', async (ctx) => {
  ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  if (!adminList.includes(userId)) return ctx.reply('❌ Unauthorized.');
  users[userId].adminStep = 'ADMIN_SEND_MESSAGE_ID';
  await saveUsers();
  ctx.reply('💬 Enter the user ID to send a message to:');
});

bot.action('admin_view_stats', async (ctx) => {
  ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  if (!adminList.includes(userId)) return ctx.reply('❌ Unauthorized.');
  await loadUsers();
  const locationStats = {};
  for (const user of Object.values(users)) {
    if (user.location) {
      locationStats[user.location] = (locationStats[user.location] || 0) + 1;
    }
  }
  const statsText = `📊 Stats:\nTotal Users: ${Object.keys(users).length}\nUsers by Location: ${Object.entries(locationStats).map(([loc, count]) => `${loc}: ${count}`).join(', ') || 'None'}`;
  await ctx.reply(statsText);
  await ctx.reply('🛠️ Admin Panel:', adminPanelKeyboard());
});

bot.action('admin_toggle_bot', async (ctx) => {
  ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  if (!adminList.includes(userId)) return ctx.reply('❌ Unauthorized.');
  botState.active = !botState.active;
  await saveBotState();
  ctx.reply(`🤖 Bot is now ${botState.active ? 'ON' : 'OFF'}.`);
  ctx.reply('🛠️ Admin Panel:', adminPanelKeyboard());
});

bot.action('admin_exit', async (ctx) => {
  ctx.answerCbQuery('Exiting admin panel.');
  const userId = ctx.from.id.toString();
  if (users[userId]) {
    users[userId].adminStep = null;
    await saveUsers();
  }
  ctx.reply('❌ Exited Admin Panel. Back to main menu:', mainMenuKeyboard(users[userId] || {}));
});

// Bot: Onboarding
bot.start(async (ctx) => {
  if (!botState.active && !adminList.includes(ctx.from.id.toString())) {
    return ctx.reply('🤖 The bot is currently turned off. Please try again later or contact an admin.');
  }
  await ctx.reply('💖 Welcome to LoveMatchBot! Ready to meet new people?');
  await ctx.reply("🔒 By using this bot, you agree your profile info will be shown to other users for matching.");

  const user = users[ctx.from.id];
  if (!user || !user.gender) {
    users[ctx.from.id] = { id: ctx.from.id, step: 'GENDER', hobbies: [] };
    await saveUsers();
    return ctx.reply(
      '🚻 To begin, please select your gender:',
      Markup.inlineKeyboard([
        [Markup.button.callback('♂️ Male', 'gender_male'), Markup.button.callback('♀️ Female', 'gender_female')],
        [Markup.button.callback('💬 Help', 'help_inline')]
      ])
    );
  }
  if (!user.name) {
    user.step = 'NAME';
    await saveUsers();
    return ctx.reply('📝 Please enter your name:', Markup.keyboard([['💬 Help']]).resize());
  }
  return ctx.reply('👋 Welcome back! Use the menu below.', mainMenuKeyboard(user));
});

bot.action('gender_male', async (ctx) => {
  ctx.answerCbQuery();
  const user = users[ctx.from.id];
  if (!user || user.step !== 'GENDER') return;
  user.gender = 'male';
  user.step = 'NAME';
  await saveUsers();
  await ctx.editMessageText('🚻 Gender set to: Male');
  await ctx.reply('📝 Please enter your name:', Markup.keyboard([['💬 Help']]).resize());
});

bot.action('gender_female', async (ctx) => {
  ctx.answerCbQuery();
  const user = users[ctx.from.id];
  if (!user || user.step !== 'GENDER') return;
  user.gender = 'female';
  user.step = 'NAME';
  await saveUsers();
  await ctx.editMessageText('🚻 Gender set to: Female');
  await ctx.reply('📝 Please enter your name:', Markup.keyboard([['💬 Help']]).resize());
});

// Inline Help
bot.action('help_inline', ctx => {
  ctx.answerCbQuery();
  ctx.reply('ℹ️ Complete your profile by following prompts and tap 👀 See matches to find your match!');
});

// Profile: handle photo
bot.on('photo', async (ctx) => {
  if (!botState.active && !adminList.includes(ctx.from.id.toString())) {
    return ctx.reply('🤖 The bot is currently turned off. Please try again later or contact an admin.');
  }
  const user = users[ctx.from.id];
  if (!user) return;

  const photos = ctx.message.photo;
  if (!photos || !photos.length) {
    return ctx.reply('🚫 No photo received. Please try again.');
  }

  user.photo = photos[photos.length - 1].file_id;

  if (user.step === 'EDIT_PHOTO') {
    user.step = 'EDITING';
    await saveUsers();
    await ctx.reply('📸 Photo updated!', editProfileKeyboard(user));
    return;
  }

  user.step = 'DONE';
  await saveUsers();
  await ctx.reply('👍 Profile complete! Use the menu below.', mainMenuKeyboard(user));

  await loadUsers();
  Object.values(users).forEach((waitingUser) => {
    if (
      waitingUser.id !== user.id &&
      waitingUser.step === 'DONE' &&
      waitingUser.gender !== user.gender &&
      validateAge(waitingUser.age) &&
      validateAge(user.age) &&
      (!waitingUser.previewMatches || !waitingUser.previewMatches.includes(user.id))
    ) {
      if (!waitingUser.previewMatches) waitingUser.previewMatches = [];
      waitingUser.previewMatches.push(user.id);
      saveUsers();
      bot.telegram.sendMessage(
        waitingUser.id,
        "👫 New match found! Someone new just finished their profile. Tap 👀 See matches to check."
      );
    }
  });
});

// Main buttons & menu
bot.hears('👀 See matches', async (ctx) => {
  if (!botState.active && !adminList.includes(ctx.from.id.toString())) {
    return ctx.reply('🤖 The bot is currently turned off. Please try again later or contact an admin.');
  }
  const user = users[ctx.from.id];
  if (!user || user.step !== 'DONE') return ctx.reply('⚠️ Please complete your profile first!');
  if (user.step === 'EDITING') return ctx.reply('✏️ Please finish editing your profile before viewing matches. Continue editing below:', editProfileKeyboard(user));

  resetUserMatchHistory(user);
  user.matchStep = 'MATCH_LOCATION';
  await saveUsers();

  return ctx.reply(
    '🌍 Where do you want your date to be from? Select a location or type your own.',
    Markup.inlineKeyboard([
      ...LOCATIONS.map((loc) => [Markup.button.callback(loc, `match_location_${loc.replace(/ /g, '_')}`)]),
      [Markup.button.callback('🌐 Any Location', 'match_location_any')],
      [Markup.button.callback('Other...', 'match_location_other')],
      [Markup.button.callback('💬 Help', 'help_inline')],
    ])
  );
});

LOCATIONS.forEach((loc) => {
  bot.action(`match_location_${loc.replace(/ /g, '_')}`, (ctx) => {
    ctx.answerCbQuery();
    showLocationMatchesForUser(ctx, loc);
  });
});

bot.action('match_location_any', (ctx) => {
  ctx.answerCbQuery();
  showLocationMatchesForUser(ctx, null);
});

bot.action('match_location_other', async (ctx) => {
  ctx.answerCbQuery();
  const user = users[ctx.from.id];
  if (!user || user.matchStep !== 'MATCH_LOCATION') return;
  user.matchStep = 'MATCH_LOCATION_TYPED';
  await saveUsers();
  ctx.reply("🌍 Please type the city or location you want your date to be from:");
});

async function showLocationMatchesForUser(ctx, location) {
  if (!botState.active && !adminList.includes(ctx.from.id.toString())) {
    return ctx.reply('🤖 The bot is currently turned off. Please try again later or contact an admin.');
  }
  const user = users[ctx.from.id];
  if (!user || user.step !== 'DONE') return ctx.reply('⚠️ Please complete your profile first!');

  const history = getUserMatchHistory(user);
  if (history.ids.length >= 2) {
    return ctx.reply('🔔 You’ve reached the daily limit of 2 matches. Try again tomorrow or choose a different location!', mainMenuKeyboard(user));
  }

  await loadUsers();
  let matches = findMatches(user, location).filter(m => !history.ids.includes(m.id));
  matches = shuffleArray(matches).slice(0, 2 - history.ids.length); // Limit to remaining matches (max 2)

  if (!matches.length) {
    if (history.ids.length === 0) {
      return ctx.reply('🔔 No matches found in that location. Try another or check back later.', mainMenuKeyboard(user));
    } else {
      return ctx.reply('🔔 No more new matches available for today in that location. Come back tomorrow for more or try a different location!', mainMenuKeyboard(user));
    }
  }

  for (const match of matches) {
    await sendMatchSummary(ctx, match);
    addToMatchHistory(user, match.id);
  }
  ctx.reply('👫 Here are your matches:', mainMenuKeyboard(user));
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

bot.action(/^reveal_contact_(\d+)$/, async (ctx) => {
  ctx.answerCbQuery();
  const matchId = ctx.match[1];
  await loadUsers();
  const match = users[matchId];
  if (!match || match.step !== 'DONE') {
    return ctx.reply('❌ Could not find user contact.');
  }
  ctx.reply(`📞 Contact info:\n${match.custom_username || match.username} (${match.username_platform_label || 'Telegram'})`);
});

bot.action(/ice_breaker_(\d+)/, async (ctx) => {
  ctx.answerCbQuery();
  const matchId = ctx.match[1];
  await loadUsers();
  const match = users[matchId];
  if (!match || match.step !== 'DONE') return ctx.reply('❌ Could not find user.');
  const iceBreaker = getIceBreaker();
  ctx.reply(`💬 Ice breaker for ${match.name}:\n"${iceBreaker}"`);
});

bot.hears('👤 Show profile', async (ctx) => {
  if (!botState.active && !adminList.includes(ctx.from.id.toString())) {
    return ctx.reply('🤖 The bot is currently turned off. Please try again later or contact an admin.');
  }
  const user = users[ctx.from.id];
  if (!user || user.step !== 'DONE') return ctx.reply('⚠️ Please complete your profile first!');
  if (user.step === 'EDITING') return ctx.reply('✏️ Please finish editing your profile before viewing your profile. Continue editing below:', editProfileKeyboard(user));

  let caption = `👤 Name: ${user.name}
🚻 Gender: ${user.gender || 'Not set'}
🎂 Age: ${user.age || 'Not set'}
📍 Location: ${user.location || 'Not set'}
🏷️ Hobbies: ${(user.hobbies || []).join(', ') || 'None'}
💡 Bio: ${user.bio || ''}`;

  if (user.username || user.custom_username) {
    caption += `\n🔗 Username: ${user.custom_username || user.username} (${user.username_platform_label || 'Telegram'})`;
  }

  if (user.photo) return ctx.replyWithPhoto(user.photo, { caption });
  return ctx.reply(caption);
});

bot.hears('✏️ Edit profile', async (ctx) => {
  if (!botState.active && !adminList.includes(ctx.from.id.toString())) {
    return ctx.reply('🤖 The bot is currently turned off. Please try again later or contact an admin.');
  }
  const user = users[ctx.from.id];
  if (!user || user.step !== 'DONE') return ctx.reply('⚠️ Please complete your profile first!');
  user.step = 'EDITING';
  await saveUsers();
  return ctx.reply('✏️ Select the field you want to edit:', editProfileKeyboard(user));
});

bot.hears('🗑️ Delete profile', async (ctx) => {
  if (!botState.active && !adminList.includes(ctx.from.id.toString())) {
    return ctx.reply('🤖 The bot is currently turned off. Please try again later or contact an admin.');
  }
  const user = users[ctx.from.id];
  if (!user) return ctx.reply('⚠️ You do not have a profile to delete.');
  user.step = 'DELETE_CONFIRM';
  await saveUsers();
  return ctx.reply(
    '⚠️ Are you sure you want to delete your profile? This action cannot be undone.',
    Markup.inlineKeyboard([
      [Markup.button.callback('✅ Yes, delete my profile', 'confirm_delete')],
      [Markup.button.callback('❌ No, keep my profile', 'cancel_delete')],
      [Markup.button.callback('💬 Help', 'help_inline')],
    ])
  );
});

bot.action('confirm_delete', async (ctx) => {
  ctx.answerCbQuery();
  const userId = ctx.from.id;
  if (!users[userId]) {
    ctx.reply('❌ No profile found to delete.');
    return;
  }
  delete users[userId];
  await db.collection('users').deleteOne({ id: userId.toString() });
  ctx.reply('🗑️ Your profile has been deleted. You can sign up again anytime by typing /start.');
});

bot.action('cancel_delete', async (ctx) => {
  ctx.answerCbQuery('Profile deletion canceled.');
  const user = users[ctx.from.id];
  if (user) user.step = 'DONE';
  await saveUsers();
  ctx.reply('❌ Profile deletion canceled. Back to main menu.', mainMenuKeyboard(user || {}));
});

bot.hears('💬 Help', (ctx) => {
  ctx.reply('ℹ️ Complete your profile by following prompts and tap 👀 See matches to find your match!');
});

bot.action('edit_cancel', async (ctx) => {
  const user = users[ctx.from.id];
  if (user) user.step = 'DONE';
  await saveUsers();
  ctx.answerCbQuery('Edit cancelled');
  ctx.reply('❌ Edit cancelled. Back to main menu:', mainMenuKeyboard(user || {}));
});

bot.on('text', async (ctx) => {
  const user = users[ctx.from.id];
  if (!user) {
    if (!botState.active && !adminList.includes(ctx.from.id.toString())) {
      return ctx.reply('🤖 The bot is currently turned off. Please try again later or contact an admin.');
    }
    return ctx.reply(
      '👋 Please sign up first to use the bot.',
      Markup.inlineKeyboard([[Markup.button.callback('📝 Sign Up', 'begin_signup')], [Markup.button.callback('💬 Help', 'help_inline')]])
    );
  }

  const text = ctx.message.text.trim();

  // Handle admin steps
  if (adminList.includes(ctx.from.id.toString()) && user.adminStep) {
    switch (user.adminStep) {
      case 'ADMIN_DELETE_USER':
        if (!users[text]) {
          await ctx.reply('❌ User ID not found. Try again:');
          return;
        }
        delete users[text];
        await db.collection('users').deleteOne({ id: text });
        user.adminStep = 'ADMIN_PANEL';
        await saveUsers();
        await ctx.reply(`🗑️ User ${text} deleted.`);
        await ctx.reply('🛠️ Admin Panel:', adminPanelKeyboard());
        return;
      case 'ADMIN_SEND_ANNOUNCEMENT':
        if (!validateString(text)) {
          await ctx.reply('📢 Please enter a valid announcement message:');
          return;
        }
        try {
          await loadUsers();
          for (const u of Object.values(users)) {
            if (u.step === 'DONE') {
              await bot.telegram.sendMessage(u.id, text);
            }
          }
          await ctx.reply('📢 Announcement sent to all users.');
        } catch (e) {
          console.error('Error sending announcement:', e);
          await ctx.reply('❌ Error sending announcement. Try again.');
        }
        user.adminStep = 'ADMIN_PANEL';
        await saveUsers();
        await ctx.reply('🛠️ Admin Panel:', adminPanelKeyboard());
        return;
      case 'ADMIN_SEND_MESSAGE_ID':
        if (!users[text]) {
          await ctx.reply('❌ User ID not found. Try again:');
          return;
        }
        user.adminStep = 'ADMIN_SEND_MESSAGE_TEXT';
        user.adminTargetUserId = text;
        await saveUsers();
        await ctx.reply('💬 Enter the message to send:');
        return;
      case 'ADMIN_SEND_MESSAGE_TEXT':
        if (!validateString(text)) {
          await ctx.reply('💬 Please enter a valid message:');
          return;
        }
        try {
          await bot.telegram.sendMessage(user.adminTargetUserId, text);
          await ctx.reply(`💬 Message sent to user ${user.adminTargetUserId}.`);
        } catch (e) {
          console.error('Error sending message:', e);
          await ctx.reply('❌ Error sending message. Try again.');
        }
        user.adminStep = 'ADMIN_PANEL';
        user.adminTargetUserId = null;
        await saveUsers();
        await ctx.reply('🛠️ Admin Panel:', adminPanelKeyboard());
        return;
    }
  }

  // Handle user profile steps
  if (!botState.active && !adminList.includes(ctx.from.id.toString())) {
    return ctx.reply('🤖 The bot is currently turned off. Please try again later or contact an admin.');
  }

  if (user.matchStep === 'MATCH_LOCATION_TYPED') {
    if (!validateString(text)) return ctx.reply("🌍 Please enter a valid location.");
    user.matchLocation = text;
    user.matchStep = null;
    await saveUsers();
    showLocationMatchesForUser(ctx, user.matchLocation);
    return;
  }

  switch (user.step) {
    case 'NAME':
      if (!validateString(text)) return ctx.reply("📝 Please enter your name (at least 2 characters).");
      user.name = text;
      user.step = 'AGE';
      await saveUsers();
      return ctx.reply('🎂 Enter your age (16-45):', Markup.keyboard([['💬 Help']]).resize());
    case 'AGE':
      {
        const age = parseInt(text, 10);
        if (isNaN(age) || !validateAge(age)) return ctx.reply("🎂 Please enter your age (16-45).");
        user.age = age;
        user.step = 'AGE_PRIVACY';
        await saveUsers();
        return ctx.reply(
          '👀 Should your age be visible to others?',
          Markup.inlineKeyboard([
            [Markup.button.callback('Yes', 'age_visible_yes')],
            [Markup.button.callback('No', 'age_visible_no')],
            [Markup.button.callback('💬 Help', 'help_inline')],
          ])
        );
      }
    case 'AGE_PRIVACY':
      return ctx.reply("👀 Please select age visibility from buttons above.", Markup.keyboard([['💬 Help']]).resize());
    case 'LOCATION_TYPED':
      if (!validateString(text)) return ctx.reply("📍 Please enter a valid location.");
      user.location = text;
      user.step = 'HOBBIES';
      await saveUsers();
      return ctx.reply('🏷️ Select your hobbies (tap to toggle, then press Done):', getHobbyKeyboard(user.hobbies));
    case 'HOBBY_TYPED':
    case 'EDIT_HOBBY_TYPED':
      if (!validateString(text)) return ctx.reply('🏷️ Please enter a valid hobby.');
      if (user.hobbies.length >= 5) {
        user.step = user.step === 'EDIT_HOBBY_TYPED' ? 'EDIT_HOBBIES' : 'HOBBIES';
        await saveUsers();
        return ctx.reply('❌ Max 5 hobbies. Remove one to add another.', getHobbyKeyboard(user.hobbies));
      }
      user.hobbies.push(text);
      user.step = user.step === 'EDIT_HOBBY_TYPED' ? 'EDIT_HOBBIES' : 'HOBBIES';
      await saveUsers();
      await ctx.reply(`🏷️ Added hobby: ${text}`, getHobbyKeyboard(user.hobbies));
      return;
    case 'BIO':
      if (!validateString(text)) return ctx.reply("💡 Please enter a short bio.");
      user.bio = text;
      if (ctx.from.username) {
        user.username = ctx.from.username;
        user.username_platform = 'telegram';
        user.username_platform_label = 'Telegram';
        user.step = 'PHOTO';
        await saveUsers();
        return ctx.reply('📸 Please send your profile picture:');
      } else {
        user.step = 'CUSTOM_USERNAME';
        await saveUsers();
        return ctx.reply('👀 No Telegram username found. Enter a username to display:');
      }
    case 'CUSTOM_USERNAME':
      if (!validateString(text)) return ctx.reply("🔗 Please enter a username.");
      user.custom_username = text;
      user.step = 'USERNAME_PLATFORM';
      await saveUsers();
      return ctx.reply(
        '📱 Where is this username from?',
        Markup.inlineKeyboard(PLATFORMS.map((p) => [Markup.button.callback(p.label, `username_source_${p.key}`)]).concat([[Markup.button.callback('💬 Help', 'help_inline')]]))
      );
    case 'CUSTOM_PLATFORM':
      if (!validateString(text)) return ctx.reply("🗂 Please enter platform name.");
      user.username_platform = text;
      user.username_platform_label = text;
      user.step = 'PHOTO';
      await saveUsers();
      return ctx.reply('📸 Please send your profile picture:');
    case 'EDIT_NAME':
      if (!validateString(text)) return ctx.reply('📝 Please enter a valid name.');
      user.name = text;
      user.step = 'EDITING';
      await saveUsers();
      return ctx.reply('📝 Name updated!', editProfileKeyboard(user));
    case 'EDIT_BIO':
      if (!validateString(text)) return ctx.reply('💡 Bio cannot be empty.');
      user.bio = text;
      user.step = 'EDITING';
      await saveUsers();
      return ctx.reply('💡 Bio updated!', editProfileKeyboard(user));
    case 'EDIT_USERNAME':
      if (!validateString(text)) return ctx.reply('🔗 Username cannot be empty.');
      user.custom_username = text;
      user.step = 'EDIT_USERNAME_PLATFORM';
      await saveUsers();
      return ctx.reply(
        '📱 Where is this username from?',
        Markup.inlineKeyboard(PLATFORMS.map((p) => [Markup.button.callback(p.label, `set_edit_username_source_${p.key}`)]).concat([[Markup.button.callback('💬 Help', 'help_inline')]]))
      );
    case 'EDIT_CUSTOM_PLATFORM':
      if (!validateString(text)) return ctx.reply('🗂 Platform name cannot be empty.');
      user.username_platform = text;
      user.username_platform_label = text;
      user.step = 'EDITING';
      await saveUsers();
      return ctx.reply('🗂 Platform updated!', editProfileKeyboard(user));
    case 'EDIT_LOCATION_TYPED':
      if (!validateString(text)) return ctx.reply("📍 Please enter a valid location.");
      user.location = text;
      user.step = 'EDITING';
      await saveUsers();
      await ctx.reply(`📍 Location updated to: ${user.location}`, editProfileKeyboard(user));
      return;
    default:
      if (!['DONE', 'EDITING'].includes(user.step)) {
        return ctx.reply("🤖 Let's continue your profile creation. Follow the prompts.");
      }
      return ctx.reply('🤖 Unknown input. Use the menu or tap 📝 Sign Up to begin!', mainMenuKeyboard(user));
  }
});

bot.action('age_visible_yes', async (ctx) => {
  ctx.answerCbQuery();
  const user = users[ctx.from.id];
  if (!user || user.step !== 'AGE_PRIVACY') return;
  user.age_visible = true;
  user.step = 'LOCATION';
  await saveUsers();
  ctx.editMessageText('🎂 Your age will be visible to others.');
  ctx.reply(
    '📍 Select your location:',
    Markup.inlineKeyboard([
      ...LOCATIONS.map((loc) => [Markup.button.callback(loc, `location_${loc.replace(/ /g, '_')}`)]),
      [Markup.button.callback('Other...', 'location_other')],
      [Markup.button.callback('💬 Help', 'help_inline')],
    ])
  );
});

bot.action('age_visible_no', async (ctx) => {
  ctx.answerCbQuery();
  const user = users[ctx.from.id];
  if (!user || user.step !== 'AGE_PRIVACY') return;
  user.age_visible = false;
  user.step = 'LOCATION';
  await saveUsers();
  ctx.editMessageText('🎂 Your age will NOT be visible to others.');
  ctx.reply(
    '📍 Select your location:',
    Markup.inlineKeyboard([
      ...LOCATIONS.map((loc) => [Markup.button.callback(loc, `location_${loc.replace(/ /g, '_')}`)]),
      [Markup.button.callback('Other...', 'location_other')],
      [Markup.button.callback('💬 Help', 'help_inline')],
    ])
  );
});

LOCATIONS.forEach((loc) => {
  bot.action(`location_${loc.replace(/ /g, '_')}`, async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'LOCATION') return;
    user.location = loc;
    user.step = 'HOBBIES';
    await saveUsers();
    ctx.editMessageText(`📍 Selected location: ${loc}`);
    ctx.reply('🏷️ Select your hobbies (tap to toggle, then press Done):', getHobbyKeyboard(user.hobbies));
  });
});

bot.action('location_other', async (ctx) => {
  ctx.answerCbQuery();
  const user = users[ctx.from.id];
  if (!user || user.step !== 'LOCATION') return;
  user.step = 'LOCATION_TYPED';
  await saveUsers();
  ctx.reply("📍 Please type your city or location:");
});

bot.action(/toggle_hobby_(.+)/, async (ctx) => {
  ctx.answerCbQuery();
  const hobbyRaw = ctx.match[1];
  const hobby = HOBBIES.find((h) => h.replace(/[^\w]/g, '') === hobbyRaw) || hobbyRaw;
  const user = users[ctx.from.id];
  if (!user || (user.step !== 'HOBBIES' && user.step !== 'EDIT_HOBBIES')) return;
  if (user.hobbies.includes(hobby)) {
    user.hobbies = user.hobbies.filter((h) => h !== hobby);
    await saveUsers();
    await ctx.editMessageReplyMarkup(getHobbyKeyboard(user.hobbies).reply_markup);
  } else {
    if (user.hobbies.length >= 5) {
      return ctx.reply('❌ You can select up to 5 hobbies only. Remove one to add another.');
    }
    user.hobbies.push(hobby);
    await saveUsers();
    await ctx.editMessageReplyMarkup(getHobbyKeyboard(user.hobbies).reply_markup);
  }
});

bot.action('hobby_other', async (ctx) => {
  ctx.answerCbQuery();
  const user = users[ctx.from.id];
  if (!user || (user.step !== 'HOBBIES' && user.step !== 'EDIT_HOBBIES')) return;
  if (user.hobbies.length >= 5) {
    return ctx.reply('❌ You can select up to 5 hobbies only. Remove one to add another.');
  }
  user.step = user.step === 'EDIT_HOBBIES' ? 'EDIT_HOBBY_TYPED' : 'HOBBY_TYPED';
  await saveUsers();
  ctx.reply('🏷️ Please type your hobby:');
});

bot.action('hobbies_done', async (ctx) => {
  ctx.answerCbQuery();
  const user = users[ctx.from.id];
  if (!user || (user.step !== 'HOBBIES' && user.step !== 'EDIT_HOBBIES')) return;
  if (!user.hobbies.length) return ctx.reply('🏷️ Select at least one hobby!');
  user.step = user.step === 'EDIT_HOBBIES' ? 'EDITING' : 'BIO';
  await saveUsers();
  await ctx.editMessageText(`🏷️ Selected hobbies: ${user.hobbies.join(', ')}`);
  if (user.step === 'EDITING') return ctx.reply('✏️ Continue editing your profile:', editProfileKeyboard(user));
  return ctx.reply('💡 Write a short bio:');
});

PLATFORMS.forEach(({ key, label }) => {
  bot.action(`username_source_${key}`, async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'USERNAME_PLATFORM') return;
    if (key === 'other') {
      user.step = 'CUSTOM_PLATFORM';
      await saveUsers();
      return ctx.reply('🗂 Please specify the platform name:');
    }
    user.username_platform = key;
    user.username_platform_label = label;
    user.step = 'PHOTO';
    await saveUsers();
    ctx.editMessageText(`🔗 Username will show as: ${user.custom_username} (${label})`);
    ctx.reply('📸 Please send your profile picture:');
  });

  bot.action(`set_edit_username_source_${key}`, async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'EDIT_USERNAME_PLATFORM') return;
    if (key === 'other') {
      user.step = 'EDIT_CUSTOM_PLATFORM';
      await saveUsers();
      return ctx.reply('🗂 Please specify the platform name:');
    }
    user.username_platform = key;
    user.username_platform_label = label;
    user.step = 'EDITING';
    await saveUsers();
    ctx.editMessageText(`🔗 Username will show as: ${user.custom_username} (${label})`);
    ctx.reply('✏️ Continue editing your profile:', editProfileKeyboard(user));
  });
});

['edit_name', 'edit_hobbies', 'edit_bio', 'edit_photo', 'edit_user_platform', 'edit_location'].forEach((action) => {
  bot.action(action, async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user) return;
    switch (action) {
      case 'edit_name':
        user.step = 'EDIT_NAME';
        ctx.reply('📝 Enter your new name:');
        break;
      case 'edit_hobbies':
        user.step = 'EDIT_HOBBIES';
        ctx.reply('🏷️ Select your hobbies (tap to toggle, then press Done):', getHobbyKeyboard(user.hobbies));
        break;
      case 'edit_bio':
        user.step = 'EDIT_BIO';
        ctx.reply('💡 Enter your new bio:');
        break;
      case 'edit_photo':
        user.step = 'EDIT_PHOTO';
        ctx.reply('📸 Please send your new profile picture:');
        break;
      case 'edit_user_platform':
        user.step = 'EDIT_USERNAME';
        ctx.reply('🔗 Enter your new profile username:');
        break;
      case 'edit_location':
        user.step = 'EDIT_LOCATION';
        ctx.reply(
          '📍 Select your new location:',
          Markup.inlineKeyboard([
            ...LOCATIONS.map((loc) => [Markup.button.callback(loc, `set_edit_location_${loc.replace(/ /g, '_')}`)]),
            [Markup.button.callback('Other...', 'set_edit_location_other')],
            [Markup.button.callback('💬 Help', 'help_inline')],
          ])
        );
        break;
    }
    await saveUsers();
  });
});

bot.action('edit_done', async (ctx) => {
  const user = users[ctx.from.id];
  if (!user) return;
  user.step = 'DONE';
  await saveUsers();
  ctx.answerCbQuery('Editing complete!');
  ctx.reply('✅ Editing complete! Use the main menu:', mainMenuKeyboard(user));
});

LOCATIONS.forEach((loc) => {
  bot.action(`set_edit_location_${loc.replace(/ /g, '_')}`, async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'EDIT_LOCATION') return;
    user.location = loc;
    user.step = 'EDITING';
    await saveUsers();
    ctx.editMessageText(`📍 Location updated to: ${loc}`);
    ctx.reply('✏️ Continue editing your profile:', editProfileKeyboard(user));
  });
});

bot.action('set_edit_location_other', async (ctx) => {
  ctx.answerCbQuery();
  const user = users[ctx.from.id];
  if (!user || user.step !== 'EDIT_LOCATION') return;
  user.step = 'EDIT_LOCATION_TYPED';
  await saveUsers();
  ctx.reply("📍 Please type your new city or location:");
});

bot.action('begin_signup', async (ctx) => {
  if (!botState.active && !adminList.includes(ctx.from.id.toString())) {
    return ctx.reply('🤖 The bot is currently turned off. Please try again later or contact an admin.');
  }
  users[ctx.from.id] = { id: ctx.from.id, step: 'GENDER', hobbies: [] };
  await saveUsers();
  await ctx.answerCbQuery();
  return ctx.reply(
    '🚻 To begin, please select your gender:',
    Markup.inlineKeyboard([
      [Markup.button.callback('♂️ Male', 'gender_male'), Markup.button.callback('♀️ Female', 'gender_female')],
      [Markup.button.callback('💬 Help', 'help_inline')]
    ])
  );
});

// Start the bot and connect to MongoDB
connectToMongoDB().then(() => {
  bot.launch().then(() => {
    console.log('Dating bot running with MongoDB and Telegram admin panel!');
  });
});

// Graceful shutdown
process.once('SIGINT', async () => {
  await client.close();
  bot.stop('SIGINT');
  console.log('Bot stopped and MongoDB connection closed.');
  process.exit();
});
process.once('SIGTERM', async () => {
  await client.close();
  bot.stop('SIGTERM');
  console.log('Bot stopped and MongoDB connection closed.');
  process.exit();
});
