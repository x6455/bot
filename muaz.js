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
const adminList = ['7771662696', '7985128436', '584821015', '6707970427' ];

// Users and bot state (in-memory cache, synced with MongoDB)
let users = {};
let botState = { active: true };

// Language Phrases
const phrases = {
    en: {
        welcome: '💖 Welcome to LoveMatchBot! Ready to meet new people?',
        agreement: "🔒 By using this bot, you agree your profile info will be shown to other users for matching.",
        select_language: 'Please select your preferred language:',
        language_set: 'Language set to English.',
        gender_prompt: '🚻 To begin, please select your gender:',
        male: '♂️ Male',
        female: '♀️ Female',
        gender_set_male: '🚻 Gender set to: Male',
        gender_set_female: '🚻 Gender set to: Female',
        name_prompt: '📝 Please enter your name:',
        name_invalid: '📝 Please enter your name (at least 2 characters).',
        welcome_back: '👋 Welcome back! Use the menu below.',
        age_prompt: '🎂 Enter your age (16-45):',
        age_invalid: '🎂 Please enter your age (16-45).',
        age_privacy_prompt: '👀 Should your age be visible to others?',
        yes: 'Yes',
        no: 'No',
        age_visible_set: '🎂 Your age will be visible to others.',
        age_not_visible_set: '🎂 Your age will NOT be visible to others.',
        select_location_prompt: '📍 Select your location:',
        location_other: 'Other...',
        location_typed_prompt: "📍 Please type your city or location:",
        location_invalid: "📍 Please enter a valid location.",
        location_selected: '📍 Selected location: ',
        location_updated: '📍 Location updated to: ',
        hobbies_prompt: '🏷️ Select your hobbies (tap to toggle, then press Done):',
        hobby_other: 'Other...',
        hobbies_done: 'Done',
        hobby_invalid: '🏷️ Please enter a valid hobby.',
        max_hobbies_reached: '❌ Max 5 hobbies. Remove one to add another.',
        added_hobby: '🏷️ Added hobby: ',
        select_at_least_one_hobby: '🏷️ Select at least one hobby!',
        selected_hobbies: '🏷️ Selected hobbies: ',
        bio_prompt: '💡 Write a short bio:',
        bio_invalid: '💡 Please enter a short bio, (less than 200 words) :',
        no_telegram_username: '👀 No Telegram username found. Enter a username to display:',
        username_prompt: '🔗 Please enter a username.',
        username_platform_prompt: '📱 Where is this username from?',
        platform_name_prompt: '🗂 Please specify the platform name:',
        platform_name_invalid: '🗂 Please enter platform name.',
        photo_prompt: '📸 Please send your profile picture:',
        no_photo_received: '🚫 No photo received. Please try again.',
        photo_updated: '📸 Photo updated!',
        profile_complete: '👍 Profile complete! Use the menu below.',
        new_match_found: "👫 New match found! Someone new just finished their profile. Tap 👀 See matches to check.",
        see_matches: '👀 See matches',
        complete_profile_first: '⚠️ Please complete your profile first!',
        finish_editing_profile: '✏️ Please finish editing your profile before viewing matches. Continue editing below:',
        where_to_match_location: '🌍 Where do you want your date to be from? Select a location or type your own.',
        any_location: '🌐 Any Location',
        daily_match_limit: '🔔 You’ve reached the daily limit of 2 matches. Try again tomorrow or choose a different location!',
        no_matches_found: '🔔 No matches found in that location. Try another or check back later.',
        no_more_new_matches: '🔔 No more new matches available for today in that location. Come back tomorrow for more or try a different location!',
        here_are_your_matches: '👫 Here are your matches:',
        see_contact: '📞 See contact',
        ice_breaker: '💬 Ice breaker',
        user_contact_not_found: '❌ Could not find user contact.',
        contact_info: '📞 Contact info:',
        ice_breaker_for: '💬 Ice breaker for ',
        show_profile: '👤 Show profile',
        edit_profile: '✏️ Edit profile',
        delete_profile: '🗑️ Delete profile',
        help: '💬 Help',
        help_text: 'ℹ️ Complete your profile by following prompts and tap 👀 See matches to find your match!',
        name_display: '👤 Name: ',
        gender_display: '🚻 Gender: ',
        age_display: '🎂 Age: ',
        location_display: '📍 Location: ',
        hobbies_display: '🏷️ Hobbies: ',
        bio_display: '💡 Bio: ',
        username_display: '🔗 Username: ',
        not_set: 'Not set',
        none: 'None',
        select_field_to_edit: '✏️ Select the field you want to edit:',
        no_profile_to_delete: '⚠️ You do not have a profile to delete.',
        delete_confirm_prompt: '⚠️ Are you sure you want to delete your profile? This action cannot be undone.',
        yes_delete: '✅ Yes, delete my profile',
        no_keep: '❌ No, keep my profile',
        profile_deleted: '🗑️ Your profile has been deleted. You can sign up again anytime by typing /start.',
        profile_deletion_canceled: '❌ Profile deletion canceled. Back to main menu.',
        edit_cancelled: '❌ Edit cancelled. Back to main menu:',
        unknown_input: '🤖 Unknown input. Use the menu or tap 📝 Sign Up to begin!',
        signup_first: '👋 Please sign up first to use the bot.',
        signup: '📝 Sign Up',
        continue_profile: "🤖 Let's continue your profile creation. Follow the prompts.",
        enter_new_name: '📝 Enter your new name:',
        name_updated: '📝 Name updated!',
        enter_new_bio: '💡 Enter your new bio:',
        bio_updated: '💡 Bio updated!',
        enter_new_username: '🔗 Enter your new profile username:',
        platform_updated: '🗂 Platform updated!',
        enter_new_location: '📍 Select your new location:',
        edit_complete: '✅ Editing complete! Use the main menu:',
        unauthorized: '❌ You are not authorized to access the admin panel. Your Telegram ID is not in the admin list.',
        admin_welcome: '🛠️ Welcome to the Admin Panel! Choose an action:',
        list_users: '📋 List Users',
        delete_user_admin: '🗑️ Delete User',
        send_announcement: '📢 Send Announcement',
        send_message_to_user: '💬 Send Message to User',
        view_stats: '📊 View Stats',
        bot_toggle: '🤖 Bot: ',
        exit_admin: '❌ Exit Admin Panel',
        user_id_to_delete: '🗑️ Enter the user ID to delete:',
        user_id_not_found: '❌ User ID not found. Try again:',
        user_deleted: '🗑️ User %s deleted.',
        announcement_message_prompt: '📢 Enter the announcement message to send to all users:',
        announcement_sent: '📢 Announcement sent to all users.',
        error_sending_announcement: '❌ Error sending announcement. Try again.',
        user_id_for_message: '💬 Enter the user ID to send a message to:',
        message_to_send: '💬 Enter the message to send:',
        message_sent_to_user: '💬 Message sent to user %s.',
        error_sending_message: '❌ Error sending message. Try again.',
        stats: '📊 Stats:',
        total_users: 'Total Users: ',
        users_by_location: 'Users by Location: ',
        bot_is_now: '🤖 Bot is now %s.',
        exiting_admin: 'Exiting admin panel.',
        bot_off_message: '🤖 The bot is currently turned off. Please try again later or contact an admin.',
        hidden: 'Hidden',
        age_visibility_buttons: "👀 Please select age visibility from buttons above.",
        telegram: 'Telegram',
        not_available: 'N/A'
    },
    am: {
        welcome: '💖 ወደ LoveMatchBot እንኳን በደህና መጡ! አዳዲስ ሰዎችን ለመተዋወቅ ዝግጁ ኖት?',
        agreement: "🔒 ይህን ቦት በመጠቀም የፈለጉትን የግል መረጃዎ ለሌሎች ተጠቃሚዎች ለማጋራት ተስማምተዋል።",
        select_language: 'እባክዎ ቋንቋዎን ይምረጡ:',
        language_set: 'ቋንቋ ወደ አማርኛ ተቀይሯል።',
        gender_prompt: '🚻 ለመጀመር፣ እባክዎ ፆታዎን ይምረጡ:',
        male: '♂️ ወንድ',
        female: '♀️ ሴት',
        gender_set_male: '🚻 ፆታዎ ተመርጧል: ወንድ',
        gender_set_female: '🚻 ፆታዎ ተመርጧል: ሴት',
        name_prompt: '📝 እባክዎ ስምዎን ያስገቡ:',
        name_invalid: '📝 እባክዎ ትክክለኛ ስም ያስገቡ (ቢያንስ 2 ፊደላት).',
        welcome_back: '👋 እንኳን ደህና መጡ! ከታች ያለውን ሜኑ ይጠቀሙ።',
        age_prompt: '🎂 ዕድሜዎን ያስገቡ (16-45):',
        age_invalid: '🎂 እባክዎ ዕድሜዎን ያስገቡ (16-45).',
        age_privacy_prompt: '👀 ዕድሜዎ ለሌሎች እንዲታይ ይፈልጋሉ?',
        yes: 'አዎ',
        no: 'አይ',
        age_visible_set: '🎂 ዕድሜዎ ለሌሎች ይታያል።',
        age_not_visible_set: '🎂 ዕድሜዎ ለሌሎች አይታይም።',
        select_location_prompt: '📍 አካባቢዎን ይምረጡ:',
        location_other: 'ሌላ...',
        location_typed_prompt: "📍 እባክዎ የሚኖሩበትን ከተማ ወይም አካባቢ ይጻፉ:",
        location_invalid: "📍 እባክዎ ትክክለኛ አካባቢ ያስገቡ።",
        location_selected: '📍 የተመረጠ አካባቢ: ',
        location_updated: '📍 አካባቢ ተስተካክሏል: ',
        hobbies_prompt: '🏷️ ማድረግ የሚያስድስቶትን ወይም የ ትርፍ ግዜ ማሳለፊያ ተግባር ይምረጡ (ለመምረጥ ይጫኑ፣ ሲጨርሱ Done ይጫኑ):',
        hobby_other: 'ሌላ...',
        hobbies_done: 'ተከናውኗል',
        hobby_invalid: '🏷️ እባክዎ ትክክለኛ የትርፍ ጊዜ ማሳለፊያ ያስገቡ።',
        max_hobbies_reached: '❌ ቢበዛ 5 የትርፍ ጊዜ ማሳለፊያዎች ብቻ። ሌላ ለመጨመር አንዱን ያጥፉ።',
        added_hobby: '🏷️ የተጨመረ የትርፍ ጊዜ ማሳለፊያ: ',
        select_at_least_one_hobby: '🏷️ ቢያንስ አንድ የትርፍ ጊዜ ማሳለፊያ ይምረጡ!',
        selected_hobbies: '🏷️ የተመረጡ የትርፍ ጊዜ ማሳለፊያዎች: ',
        bio_prompt: '💡 እራሶን በአጭሩ ይግለጹ  :',
        bio_invalid: '💡 እባክዎ እራሶን በአጭሩ ይግለጹ።',
        no_telegram_username: '👀 የቴሌግራም  username አልተገኘም። ለማሳየት የሚፈልጉትን username ያስገቡ:',
        username_prompt: '🔗 እባክዎ username ያስገቡ።',
        username_platform_prompt: '📱 ይህ የተጠቃሚ ስም ከየትኛው ነው?',
        platform_name_prompt: '🗂 እባክዎ username ያስገቡ:',
        platform_name_invalid: '🗂 እባክዎ username ያስገቡ።',
        photo_prompt: '📸 እባክዎ የግል ፎቶ ያስገቡ :',
        no_photo_received: '🚫 ምንም ፎቶ አልተቀበልንም። እባክዎ እንደገና ይሞክሩ።',
        photo_updated: '📸 ፎቶ ተስተካክሏል!',
        profile_complete: '👍 ፕሮፋይልዎ ተጠናቋል! ከታች ያለውን ሜኑ ይጠቀሙ።',
        new_match_found: "👫 አዲስ match ተገኝቷል! አንድ አዲስ ሰው ፕሮፋይሉን አጠናቅቋል። ለማየት 👀 See matches ይጫኑ።",
        see_matches: '👀 match ይመልከቱ',
        complete_profile_first: '⚠️ እባክዎ መጀመሪያ ፕሮፋይልዎን ይሙሉ።',
        finish_editing_profile: '✏️ match ከማየትዎ በፊት ፕሮፋይልዎን ማስተካከል ይጨርሱ። ከታች ማስተካከል ይቀጥሉ:',
        where_to_match_location: '🌍 የእርሶ match ከየት እንዲሆን ይፈልጋሉ? አካባቢ ይምረጡ ወይም የራስዎን ይጻፉ።',
        any_location: '🌐 ማንኛውም አካባቢ',
        daily_match_limit: '🔔 በቀን ማየት የሚፈቀደው 2 ኣካውንት ብቻ ነው  ። ነገ እንደገና ይሞክሩ !',
        no_matches_found: '🔔 በዚያ አካባቢ ምንም match  አልተገኘም። ሌላ ይሞክሩ ወይም በኋላ ደግመው ይመልከቱ።',
        no_more_new_matches: '🔔 ለዛሬ ተጨማሪ አዳዲስ match  የሉም። ለተጨማሪ ነገ ይመለሱ !',
        here_are_your_matches: '👫 አድሎን ይሞክሩ:',
        see_contact: '📞 ለመተዋወቅ መረጃ ይመልከቱ',
        ice_breaker: '💬 ለመተዋወቅ የሚረዱ ጨዋታ ማስጀመርያዎች',
        user_contact_not_found: '❌ የተጠቃሚ መረጃ ማግኘት አልተቻለም።',
        contact_info: '📞  የግል ኣካውንት:',
        ice_breaker_for: '💬 ለለመተዋወቅ የሚረዱ ጨዋታ ማስጀመርያዎች ',
        show_profile: '👤 የኔ ፕሮፋይል',
        edit_profile: '✏️ ፕሮፋይል አስተካክል',
        delete_profile: '🗑️ ፕሮፋይል ሰርዝ',
        help: '💬 እገዛ',
        help_text: 'ℹ️ ፕሮፋይልዎን በማስገባት እና 👀 See matches በመጫን አጋርዎን ያግኙ!',
        name_display: '👤 ስም: ',
        gender_display: '🚻 ፆታ: ',
        age_display: '🎂 ዕድሜ: ',
        location_display: '📍 አካባቢ: ',
        hobbies_display: '🏷️ የትርፍ ጊዜ ማሳለፊያዎች ወይም የሚወዷቸው ነገሮች : ',
        bio_display: '💡 ባዮ: ',
        username_display: '🔗 username: ',
        not_set: 'አልተቀመጠም',
        none: 'የለም',
        select_field_to_edit: '✏️ ማስተካከል የሚፈልጉትን መስክ ይምረጡ:',
        no_profile_to_delete: '⚠️ ሊሰርዙት የሚችሉት ፕሮፋይል የለዎትም።',
        delete_confirm_prompt: '⚠️ ፕሮፋይልዎን መሰረዝ እንደሚፈልጉ እርግጠኛ ኖት? ይህን እርምጃ መቀልበስ አይቻልም።',
        yes_delete: '✅ አዎ፣ ፕሮፋይሌን ሰርዝ',
        no_keep: '❌ አይ፣ ፕሮፋይሌን አቆይ',
        profile_deleted: '🗑️ ፕሮፋይልዎ ተሰርዟል። በማንኛውም ጊዜ /start በመጻፍ እንደገና መመዝገብ ይችላሉ።',
        profile_deletion_canceled: '❌ የፕሮፋይል መሰረዝ ተሰርዟል። ወደ ዋናው ሜኑ ይመለሱ።',
        edit_cancelled: '❌ ማስተካከያ ተሰርዟል። ወደ ዋናው ሜኑ ይመለሱ:',
        unknown_input: '🤖 ያልታወቀ መረጃ። ሜኑውን ይጠቀሙ ወይም ለመጀመር 📝 Sign Up ን ይጫኑ!',
        signup_first: '👋 እባክዎ ቦቱን ለመጠቀም መጀመሪያ ይመዝገቡ።',
        signup: '📝 ይመዝገቡ',
        continue_profile: "🤖 የፕሮፋይልዎን መሙላት እንቀጥልበታለን። መመሪያዎቹን ይከተሉ።",
        enter_new_name: '📝 አዲስ ስምዎን ያስገቡ:',
        name_updated: '📝 ስም ተስተካክሏል!',
        enter_new_bio: '💡 አዲስ ባዮዎን ያስገቡ:',
        bio_updated: '💡 ባዮ ተስተካክሏል!',
        enter_new_username: '🔗 አዲስ ፕሮፋይል ዩዘር ኔም ያስገቡ:',
        platform_updated: '🗂 ኣካውንት ተስተካክሏል!',
        enter_new_location: '📍 አዲስ አካባቢዎን ይምረጡ:',
        edit_complete: '✅ ማስተካከያ ተጠናቋል! ዋናውን ሜኑ ይጠቀሙ:',
        unauthorized: '❌ Admin panel ለመጠቀም ፍቃድ የለዎትም።',
        admin_welcome: '🛠️ ወደ አስተዳዳሪ ፓነል እንኳን በደህና መጡ! ድርጊት ይምረጡ:',
        list_users: '📋 ተጠቃሚዎችን ዘርዝር',
        delete_user_admin: '🗑️ ተጠቃሚ ሰርዝ',
        send_announcement: '📢 ማስታወቂያ ላክ',
        send_message_to_user: '💬 ለተጠቃሚ መልእክት ላክ',
        view_stats: '📊 ስታትስቲክስ ይመልከቱ',
        bot_toggle: '🤖 ቦት: ',
        exit_admin: '❌ ከአስተዳዳሪ ፓነል ውጣ',
        user_id_to_delete: '🗑️ የሚሰረዘውን የተጠቃሚ መታወቂያ ያስገቡ:',
        user_id_not_found: '❌ የተጠቃሚ መታወቂያ አልተገኘም። እንደገና ይሞክሩ:',
        user_deleted: '🗑️ ተጠቃሚ %s ተሰርዟል።',
        announcement_message_prompt: '📢 ለሁሉም ተጠቃሚዎች የሚላከውን የማስታወቂያ መልእክት ያስገቡ:',
        announcement_sent: '📢 ማስታወቂያ ለሁሉም ተጠቃሚዎች ተልኳል።',
        error_sending_announcement: '❌ ማስታወቂያ በመላክ ላይ ስህተት ተፈጥሯል። እንደገና ይሞክሩ።',
        user_id_for_message: '💬 መልእክት ለመላክ የተጠቃሚውን መታወቂያ ያስገቡ:',
        message_to_send: '💬 የሚላከውን መልእክት ያስገቡ:',
        message_sent_to_user: '💬 መልእክት ለተጠቃሚ %s ተልኳል።',
        error_sending_message: '❌ መልእክት በመላክ ላይ ስህተት ተፈጥሯል። እንደገና ይሞክሩ።',
        stats: '📊 ስታትስቲክስ:',
        total_users: 'ጠቅላላ ተጠቃሚዎች: ',
        users_by_location: 'በአካባቢ ያሉ ተጠቃሚዎች: ',
        bot_is_now: '🤖 ቦት አሁን %s ነው።',
        exiting_admin: 'ከአስተዳዳሪ ፓነል በመውጣት ላይ።',
        bot_off_message: '🤖 ቦቱ በአሁኑ ጊዜ ጠፍቷል። እባክዎ በኋላ ይሞክሩ ወይም አስተዳዳሪን ያነጋግሩ።',
        hidden: 'የተደበቀ',
        age_visibility_buttons: "👀 እባክዎ ከላይ ካሉት አዝራሮች የዕድሜን ታይነት ይምረጡ።",
        telegram: 'ቴሌግራም',
        not_available: 'አልተዘጋጀም'
    }
};

function getPhrase(key, lang = 'en', ...args) {
    let phrase = phrases[lang][key] || phrases['en'][key]; // Fallback to English if not found
    if (!phrase) return `MISSING_PHRASE_${key}`; // Indicate missing translation

    // Simple string formatting for placeholders like %s
    if (args.length > 0) {
        let i = 0;
        phrase = phrase.replace(/%s/g, () => args[i++] || '');
    }
    return phrase;
}

// Detailed hobbies list
const HOBBIES = [
    '☕ Coffee lover',
    '💃 Dancing ',
    '🎤 Singing ',
    '🎮 Gaming ',
    '🎲 Chess / cards ',
    '👩🍳 Cooking ',
    '🍷 Wine / Beer tasting ',
    '🍪 Baking ',
    '✍️ Writing ',
    '🎨 Drawing / Painting ',
    '📸 Photography ',
    '✂️ Fashion ',
    '📚 Reading ',
    '🗣️ Learning languages ',
    '🎙️ deep thinking and wondering about nature	',
    '⚽ Football fanatic ',
    '🏋️ Gym / Fitness ',
    '🏃 Running ',
    '🎵 Music/ producing ',
    '🎭 Comedy ',
    '✈️ Travel dreams ',
    '🌱 in to the nature  ',
    '🎧 casset collector ',
    '🔮 Astrology / Tarot reading ',
];

const LOCATIONS = ['Addis Ababa', 'Mekelle', 'Hawassa', 'Gonder', 'Adama', 'Dire Dawa'];
const PLATFORMS = [
    { key: 'telegram', label: 'Telegram' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'x', label: 'X (Twitter)' },
    { key: 'other', label: 'Other' },
];

// Ice breakers pool
const ICE_BREAKERS = [
    "Hey! im not photographer but i can picture us together?",
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
    const lang = user ? user.language : 'en';
    const buttons = [
        [getPhrase('see_matches', lang)],
        [getPhrase('show_profile', lang), getPhrase('edit_profile', lang)],
        [getPhrase('delete_profile', lang)],
        [getPhrase('help', lang)]
    ];
    if (adminList.includes(user.id.toString())) {
        buttons.push(['🛠️ Admin panel']);
    }
    return Markup.keyboard(buttons).resize();
}

// Admin panel keyboard
function adminPanelKeyboard(lang = 'en') {
    return Markup.inlineKeyboard([
        [Markup.button.callback(getPhrase('list_users', lang), 'admin_list_users')],
        [Markup.button.callback(getPhrase('delete_user_admin', lang), 'admin_delete_user')],
        [Markup.button.callback(getPhrase('send_announcement', lang), 'admin_send_announcement')],
        [Markup.button.callback(getPhrase('send_message_to_user', lang), 'admin_send_message')],
        [Markup.button.callback(getPhrase('view_stats', lang), 'admin_view_stats')],
        [Markup.button.callback(`${getPhrase('bot_toggle', lang)}${botState.active ? 'ON' : 'OFF'}`, 'admin_toggle_bot')],
        [Markup.button.callback(getPhrase('exit_admin', lang), 'admin_exit')],
    ]);
}

// Hobby selection keyboard
function getHobbyKeyboard(selected = [], lang = 'en') {
    return Markup.inlineKeyboard(
        [
            ...HOBBIES.map((hobby) => [
                Markup.button.callback(
                    selected.includes(hobby) ? `✅ ${hobby}` : `🏷️ ${hobby}`,
                    `toggle_hobby_${hobby.replace(/[^\w]/g, '')}`
                ),
            ]),
            [Markup.button.callback(getPhrase('hobby_other', lang), 'hobby_other')],
            [Markup.button.callback(getPhrase('hobbies_done', lang), 'hobbies_done')],
            [Markup.button.callback(getPhrase('help', lang), 'help_inline')],
        ]
    );
}

// Edit profile menu keyboard
function editProfileKeyboard(user) {
    const lang = user.language;
    return Markup.inlineKeyboard([
        [Markup.button.callback(`${getPhrase('name_display', lang)}${user.name || ''}`, 'edit_name')],
        [Markup.button.callback(`${getPhrase('location_display', lang)}${user.location || ''}`, 'edit_location')],
        [Markup.button.callback(`${getPhrase('hobbies_display', lang)}${(user.hobbies || []).join(', ') || getPhrase('none', lang)}`, 'edit_hobbies')],
        [Markup.button.callback(getPhrase('bio_display', lang), 'edit_bio')],
        [Markup.button.callback(getPhrase('photo_prompt', lang), 'edit_photo')],
        [Markup.button.callback(
            `${getPhrase('username_display', lang)}${user.custom_username || user.username || ''} (${user.username_platform_label || user.username_platform || getPhrase('telegram', lang)})`,
            'edit_user_platform')],
        [Markup.button.callback('❌ ' + getPhrase('edit_cancel', lang), 'edit_cancel')],
        [Markup.button.callback('✅ ' + getPhrase('hobbies_done', lang), 'edit_done')], // Re-using hobbies_done for "Done"
        [Markup.button.callback(getPhrase('help', lang), 'help_inline')],
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
            (location === null || u.location === location) &&
            u.id.toString() !== me.id.toString() // Exclude self
    );
}

function formatMatchCaption(match, lang = 'en') {
    return `${getPhrase('name_display', lang)}${match.name}\n` +
        (match.age_visible !== false ? `${getPhrase('age_display', lang)}${match.age}\n` : '') +
        `${getPhrase('location_display', lang)}${match.location}\n` +
        `${getPhrase('hobbies_display', lang)}${Array.isArray(match.hobbies) ? match.hobbies.join(', ') : match.hobbies || getPhrase('none', lang)}\n` +
        `${getPhrase('bio_display', lang)}${match.bio}`;
}

function sendMatchSummary(ctx, match) {
    const lang = users[ctx.from.id].language || 'en';
    const caption = formatMatchCaption(match, lang);
    const replyMarkup = Markup.inlineKeyboard([
        [Markup.button.callback(getPhrase('see_contact', lang), `reveal_contact_${match.id}`)],
        [Markup.button.callback(getPhrase('ice_breaker', lang), `ice_breaker_${match.id}`)],
        [Markup.button.callback(getPhrase('help', lang), 'help_inline')],
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

// Middleware for bot active status and admin check
const botStatusMiddleware = async (ctx, next) => {
    const userId = ctx.from.id.toString();
    const isAdmin = adminList.includes(userId);

    // If bot is off and user is not an admin, send message and stop
    if (!botState.active && !isAdmin) {
        return ctx.reply(getPhrase('bot_off_message', users[userId] ? users[userId].language : 'en'));
    }
    await next(); // Continue processing
};
bot.use(botStatusMiddleware);

// Bot control command
bot.command('botcontrol', async (ctx) => {
    const userId = ctx.from.id.toString();
    const lang = users[userId] ? users[userId].language : 'en';
    if (!adminList.includes(userId)) {
        return ctx.reply(getPhrase('unauthorized', lang));
    }
    botState.active = !botState.active;
    await saveBotState();
    ctx.reply(getPhrase('bot_is_now', lang, botState.active ? 'ON' : 'OFF'));
    ctx.reply(getPhrase('admin_welcome', lang), adminPanelKeyboard(lang));
});

// Admin panel: Telegram-based
bot.command('admin', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!adminList.includes(userId)) {
        return ctx.reply(getPhrase('unauthorized', users[userId] ? users[userId].language : 'en'));
    }
    users[userId] = users[userId] || { id: userId, step: 'DONE', hobbies: [], language: 'en' }; // Ensure admin has a basic user object
    users[userId].adminStep = 'ADMIN_PANEL';
    await saveUsers();
    return ctx.reply(getPhrase('admin_welcome', users[userId].language), adminPanelKeyboard(users[userId].language));
});

bot.action('admin_list_users', async (ctx) => {
    ctx.answerCbQuery();
    const userId = ctx.from.id.toString();
    const lang = users[userId].language;
    if (!adminList.includes(userId)) return ctx.reply(getPhrase('unauthorized', lang));
    await loadUsers(); // Refresh users from MongoDB
    const userList = Object.values(users)
        .map(u => {
            const u_lang = u.language || 'en';
            return `ID: ${u.id}\n${getPhrase('name_display', u_lang)}: ${u.name || getPhrase('not_available', u_lang)}\n` +
                   `${getPhrase('gender_display', u_lang)}: ${u.gender || getPhrase('not_available', u_lang)}\n` +
                   `${getPhrase('age_display', u_lang)}: ${u.age_visible !== false ? (u.age || getPhrase('not_available', u_lang)) : getPhrase('hidden', u_lang)}\n` +
                   `${getPhrase('location_display', u_lang)}: ${u.location || getPhrase('not_available', u_lang)}\n` +
                   `${getPhrase('hobbies_display', u_lang)}: ${(u.hobbies || []).join(', ') || getPhrase('none', u_lang)}`;
        })
        .join('\n\n');
    await ctx.reply(userList || getPhrase('no_users_found', lang)); // Need to add 'no_users_found' to phrases
    await ctx.reply(getPhrase('admin_welcome', lang), adminPanelKeyboard(lang));
});

bot.action('admin_delete_user', async (ctx) => {
    ctx.answerCbQuery();
    const userId = ctx.from.id.toString();
    const lang = users[userId].language;
    if (!adminList.includes(userId)) return ctx.reply(getPhrase('unauthorized', lang));
    users[userId].adminStep = 'ADMIN_DELETE_USER';
    await saveUsers();
    ctx.reply(getPhrase('user_id_to_delete', lang));
});

bot.action('admin_send_announcement', async (ctx) => {
    ctx.answerCbQuery();
    const userId = ctx.from.id.toString();
    const lang = users[userId].language;
    if (!adminList.includes(userId)) return ctx.reply(getPhrase('unauthorized', lang));
    users[userId].adminStep = 'ADMIN_SEND_ANNOUNCEMENT';
    await saveUsers();
    ctx.reply(getPhrase('announcement_message_prompt', lang));
});

bot.action('admin_send_message', async (ctx) => {
    ctx.answerCbQuery();
    const userId = ctx.from.id.toString();
    const lang = users[userId].language;
    if (!adminList.includes(userId)) return ctx.reply(getPhrase('unauthorized', lang));
    users[userId].adminStep = 'ADMIN_SEND_MESSAGE_ID';
    await saveUsers();
    ctx.reply(getPhrase('user_id_for_message', lang));
});

bot.action('admin_view_stats', async (ctx) => {
    ctx.answerCbQuery();
    const userId = ctx.from.id.toString();
    const lang = users[userId].language;
    if (!adminList.includes(userId)) return ctx.reply(getPhrase('unauthorized', lang));
    await loadUsers();
    const locationStats = {};
    for (const user of Object.values(users)) {
        if (user.location) {
            locationStats[user.location] = (locationStats[user.location] || 0) + 1;
        }
    }
    const statsText = `${getPhrase('stats', lang)}\n${getPhrase('total_users', lang)}${Object.keys(users).length}\n${getPhrase('users_by_location', lang)}${Object.entries(locationStats).map(([loc, count]) => `${loc}: ${count}`).join(', ') || getPhrase('none', lang)}`;
    await ctx.reply(statsText);
    await ctx.reply(getPhrase('admin_welcome', lang), adminPanelKeyboard(lang));
});

bot.action('admin_toggle_bot', async (ctx) => {
    ctx.answerCbQuery();
    const userId = ctx.from.id.toString();
    const lang = users[userId].language;
    if (!adminList.includes(userId)) return ctx.reply(getPhrase('unauthorized', lang));
    botState.active = !botState.active;
    await saveBotState();
    ctx.reply(getPhrase('bot_is_now', lang, botState.active ? 'ON' : 'OFF'));
    ctx.reply(getPhrase('admin_welcome', lang), adminPanelKeyboard(lang));
});

bot.action('admin_exit', async (ctx) => {
    const userId = ctx.from.id.toString();
    const lang = users[userId] ? users[userId].language : 'en'; // get language before clearing adminStep
    ctx.answerCbQuery(getPhrase('exiting_admin', lang));
    if (users[userId]) {
        users[userId].adminStep = null;
        await saveUsers();
    }
    ctx.reply(getPhrase('edit_cancelled', lang), mainMenuKeyboard(users[userId] || { id: userId, language: 'en' }));
});


// Bot: Onboarding - Language Selection
bot.start(async (ctx) => {
    const userId = ctx.from.id.toString();
    // Special handling for initial start to set language
    if (!users[userId] || !users[userId].language) {
        users[userId] = { id: userId, step: 'SELECT_LANGUAGE', hobbies: [], language: 'en' }; // Default to English initially
        await saveUsers();
        return ctx.reply(
            getPhrase('select_language', 'en'),
            Markup.inlineKeyboard([
                [Markup.button.callback('English 🇬🇧', 'set_lang_en')],
                [Markup.button.callback('አማርኛ 🇪🇹', 'set_lang_am')]
            ])
        );
    }

    // Existing user or language already set
    const user = users[userId];
    const lang = user.language;

    if (!botState.active && !adminList.includes(userId)) {
        return ctx.reply(getPhrase('bot_off_message', lang));
    }

    await ctx.reply(getPhrase('welcome', lang));
    await ctx.reply(getPhrase('agreement', lang));

    if (!user.gender) {
        user.step = 'GENDER';
        await saveUsers();
        return ctx.reply(
            getPhrase('gender_prompt', lang),
            Markup.inlineKeyboard([
                [Markup.button.callback(getPhrase('male', lang), 'gender_male'), Markup.button.callback(getPhrase('female', lang), 'gender_female')],
                [Markup.button.callback(getPhrase('help', lang), 'help_inline')]
            ])
        );
    }
    if (!user.name) {
        user.step = 'NAME';
        await saveUsers();
        return ctx.reply(getPhrase('name_prompt', lang), Markup.keyboard([[getPhrase('help', lang)]]).resize());
    }
    return ctx.reply(getPhrase('welcome_back', lang), mainMenuKeyboard(user));
});

bot.action('set_lang_en', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'SELECT_LANGUAGE') return;
    user.language = 'en';
    user.step = 'GENDER'; // Move to next step after language selection
    await saveUsers();
    await ctx.editMessageText(getPhrase('language_set', 'en'));
    return ctx.reply(
        getPhrase('gender_prompt', 'en'),
        Markup.inlineKeyboard([
            [Markup.button.callback(getPhrase('male', 'en'), 'gender_male'), Markup.button.callback(getPhrase('female', 'en'), 'gender_female')],
            [Markup.button.callback(getPhrase('help', 'en'), 'help_inline')]
        ])
    );
});

bot.action('set_lang_am', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'SELECT_LANGUAGE') return;
    user.language = 'am';
    user.step = 'GENDER'; // Move to next step after language selection
    await saveUsers();
    await ctx.editMessageText(getPhrase('language_set', 'am'));
    return ctx.reply(
        getPhrase('gender_prompt', 'am'),
        Markup.inlineKeyboard([
            [Markup.button.callback(getPhrase('male', 'am'), 'gender_male'), Markup.button.callback(getPhrase('female', 'am'), 'gender_female')],
            [Markup.button.callback(getPhrase('help', 'am'), 'help_inline')]
        ])
    );
});

bot.action('gender_male', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'GENDER') return;
    const lang = user.language;
    user.gender = 'male';
    user.step = 'NAME';
    await saveUsers();
    await ctx.editMessageText(getPhrase('gender_set_male', lang));
    await ctx.reply(getPhrase('name_prompt', lang), Markup.keyboard([[getPhrase('help', lang)]]).resize());
});

bot.action('gender_female', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'GENDER') return;
    const lang = user.language;
    user.gender = 'female';
    user.step = 'NAME';
    await saveUsers();
    await ctx.editMessageText(getPhrase('gender_set_female', lang));
    await ctx.reply(getPhrase('name_prompt', lang), Markup.keyboard([[getPhrase('help', lang)]]).resize());
});

// Inline Help
bot.action('help_inline', ctx => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    const lang = user ? user.language : 'en';
    ctx.reply(getPhrase('help_text', lang));
});

// Profile: handle photo
bot.on('photo', async (ctx) => {
    const user = users[ctx.from.id];
    if (!user) return; // Middleware should handle bot_off_message
    const lang = user.language;

    const photos = ctx.message.photo;
    if (!photos || !photos.length) {
        return ctx.reply(getPhrase('no_photo_received', lang));
    }

    user.photo = photos[photos.length - 1].file_id;

    if (user.step === 'EDIT_PHOTO') {
        user.step = 'EDITING';
        await saveUsers();
        await ctx.reply(getPhrase('photo_updated', lang), editProfileKeyboard(user));
        return;
    }

    user.step = 'DONE';
    await saveUsers();
    await ctx.reply(getPhrase('profile_complete', lang), mainMenuKeyboard(user));

    await loadUsers(); // Reload to get updated user list for notifications
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
                getPhrase('new_match_found', waitingUser.language || 'en')
            );
        }
    });
});

// Main buttons & menu
bot.hears(Object.values(phrases).map(p => p.see_matches), async (ctx) => {
    const user = users[ctx.from.id];
    const lang = user.language;
    if (!user || user.step !== 'DONE') return ctx.reply(getPhrase('complete_profile_first', lang));
    if (user.step === 'EDITING') return ctx.reply(getPhrase('finish_editing_profile', lang), editProfileKeyboard(user));

    resetUserMatchHistory(user);
    user.matchStep = 'MATCH_LOCATION';
    await saveUsers();

    return ctx.reply(
        getPhrase('where_to_match_location', lang),
        Markup.inlineKeyboard([
            ...LOCATIONS.map((loc) => [Markup.button.callback(loc, `match_location_${loc.replace(/ /g, '_')}`)]),
            [Markup.button.callback(getPhrase('any_location', lang), 'match_location_any')],
            [Markup.button.callback(getPhrase('location_other', lang), 'match_location_other')],
            [Markup.button.callback(getPhrase('help', lang), 'help_inline')],
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
    const lang = user.language;
    user.matchStep = 'MATCH_LOCATION_TYPED';
    await saveUsers();
    ctx.reply(getPhrase('location_typed_prompt', lang));
});

async function showLocationMatchesForUser(ctx, location) {
    const user = users[ctx.from.id];
    const lang = user.language;
    if (!user || user.step !== 'DONE') return ctx.reply(getPhrase('complete_profile_first', lang));

    const history = getUserMatchHistory(user);
    if (history.ids.length >= 2) {
        return ctx.reply(getPhrase('daily_match_limit', lang), mainMenuKeyboard(user));
    }

    await loadUsers();
    let matches = findMatches(user, location).filter(m => !history.ids.includes(m.id));
    matches = shuffleArray(matches).slice(0, 2 - history.ids.length); // Limit to remaining matches (max 2)

    if (!matches.length) {
        if (history.ids.length === 0) {
            return ctx.reply(getPhrase('no_matches_found', lang), mainMenuKeyboard(user));
        } else {
            return ctx.reply(getPhrase('no_more_new_matches', lang), mainMenuKeyboard(user));
        }
    }

    for (const match of matches) {
        await sendMatchSummary(ctx, match);
        addToMatchHistory(user, match.id);
    }
    ctx.reply(getPhrase('here_are_your_matches', lang), mainMenuKeyboard(user));
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
    const user = users[ctx.from.id];
    const lang = user ? user.language : 'en'; // Default to English if user not found (unlikely here)
    await loadUsers();
    const match = users[matchId];
    if (!match || match.step !== 'DONE') {
        return ctx.reply(getPhrase('user_contact_not_found', lang));
    }
    ctx.reply(`${getPhrase('contact_info', lang)}\n${match.custom_username || match.username} (${match.username_platform_label || getPhrase('telegram', lang)})`);
});

bot.action(/ice_breaker_(\d+)/, async (ctx) => {
    ctx.answerCbQuery();
    const matchId = ctx.match[1];
    const user = users[ctx.from.id];
    const lang = user ? user.language : 'en';
    await loadUsers();
    const match = users[matchId];
    if (!match || match.step !== 'DONE') return ctx.reply(getPhrase('user_contact_not_found', lang));
    const iceBreaker = getIceBreaker();
    ctx.reply(`${getPhrase('ice_breaker_for', lang)}${match.name}:\n"${iceBreaker}"`);
});

bot.hears(Object.values(phrases).map(p => p.show_profile), async (ctx) => {
    const user = users[ctx.from.id];
    const lang = user.language;
    if (!user || user.step !== 'DONE') return ctx.reply(getPhrase('complete_profile_first', lang));
    if (user.step === 'EDITING') return ctx.reply(getPhrase('finish_editing_profile', lang), editProfileKeyboard(user));

    let caption = `${getPhrase('name_display', lang)}${user.name}\n` +
        `${getPhrase('gender_display', lang)}${user.gender || getPhrase('not_set', lang)}\n` +
        `${getPhrase('age_display', lang)}${user.age || getPhrase('not_set', lang)}\n` +
        `${getPhrase('location_display', lang)}${user.location || getPhrase('not_set', lang)}\n` +
        `${getPhrase('hobbies_display', lang)}${(user.hobbies || []).join(', ') || getPhrase('none', lang)}\n` +
        `${getPhrase('bio_display', lang)}${user.bio || ''}`;

    if (user.username || user.custom_username) {
        caption += `\n${getPhrase('username_display', lang)}${user.custom_username || user.username} (${user.username_platform_label || getPhrase('telegram', lang)})`;
    }

    if (user.photo) return ctx.replyWithPhoto(user.photo, { caption });
    return ctx.reply(caption);
});

bot.hears(Object.values(phrases).map(p => p.edit_profile), async (ctx) => {
    const user = users[ctx.from.id];
    const lang = user.language;
    if (!user || user.step !== 'DONE') return ctx.reply(getPhrase('complete_profile_first', lang));
    user.step = 'EDITING';
    await saveUsers();
    return ctx.reply(getPhrase('select_field_to_edit', lang), editProfileKeyboard(user));
});

bot.hears(Object.values(phrases).map(p => p.delete_profile), async (ctx) => {
    const user = users[ctx.from.id];
    const lang = user.language;
    if (!user) return ctx.reply(getPhrase('no_profile_to_delete', lang));
    user.step = 'DELETE_CONFIRM';
    await saveUsers();
    return ctx.reply(
        getPhrase('delete_confirm_prompt', lang),
        Markup.inlineKeyboard([
            [Markup.button.callback(getPhrase('yes_delete', lang), 'confirm_delete')],
            [Markup.button.callback(getPhrase('no_keep', lang), 'cancel_delete')],
            [Markup.button.callback(getPhrase('help', lang), 'help_inline')],
        ])
    );
});

bot.action('confirm_delete', async (ctx) => {
    ctx.answerCbQuery();
    const userId = ctx.from.id;
    const lang = users[userId] ? users[userId].language : 'en';
    if (!users[userId]) {
        ctx.reply(getPhrase('no_profile_to_delete', lang)); // Re-using this phrase
        return;
    }
    delete users[userId];
    await db.collection('users').deleteOne({ id: userId.toString() });
    ctx.reply(getPhrase('profile_deleted', lang));
});

bot.action('cancel_delete', async (ctx) => {
    const user = users[ctx.from.id];
    const lang = user ? user.language : 'en';
    ctx.answerCbQuery(getPhrase('profile_deletion_canceled', lang));
    if (user) user.step = 'DONE';
    await saveUsers();
    ctx.reply(getPhrase('profile_deletion_canceled', lang), mainMenuKeyboard(user || {}));
});

bot.hears(Object.values(phrases).map(p => p.help), (ctx) => {
    const user = users[ctx.from.id];
    const lang = user ? user.language : 'en';
    ctx.reply(getPhrase('help_text', lang));
});

bot.action('edit_cancel', async (ctx) => {
    const user = users[ctx.from.id];
    const lang = user ? user.language : 'en';
    if (user) user.step = 'DONE';
    await saveUsers();
    ctx.answerCbQuery(getPhrase('edit_cancelled', lang));
    ctx.reply(getPhrase('edit_cancelled', lang), mainMenuKeyboard(user || {}));
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id.toString();
    const user = users[userId];

    if (!user) { // If user not found in memory, they haven't started or language isn't set
        if (!botState.active && !adminList.includes(ctx.from.id.toString())) {
            return ctx.reply(getPhrase('bot_off_message', 'en')); // Use default English
        }
        return ctx.reply(
            getPhrase('signup_first', 'en'),
            Markup.inlineKeyboard([[Markup.button.callback(getPhrase('signup', 'en'), 'begin_signup')], [Markup.button.callback(getPhrase('help', 'en'), 'help_inline')]])
        );
    }

    const lang = user.language;
    const text = ctx.message.text.trim();

    // Handle admin steps
    if (adminList.includes(userId) && user.adminStep) {
        switch (user.adminStep) {
            case 'ADMIN_DELETE_USER':
                if (!users[text]) {
                    await ctx.reply(getPhrase('user_id_not_found', lang));
                    return;
                }
                // Confirm user exists in DB before attempting delete
                const userToDelete = await db.collection('users').findOne({ id: text });
                if (!userToDelete) {
                    await ctx.reply(getPhrase('user_id_not_found', lang));
                    return;
                }

                delete users[text]; // Remove from in-memory cache
                await db.collection('users').deleteOne({ id: text }); // Delete from MongoDB
                user.adminStep = 'ADMIN_PANEL';
                await saveUsers();
                await ctx.reply(getPhrase('user_deleted', lang, text));
                await ctx.reply(getPhrase('admin_welcome', lang), adminPanelKeyboard(lang));
                return;
            case 'ADMIN_SEND_ANNOUNCEMENT':
                if (!validateString(text)) {
                    await ctx.reply(getPhrase('announcement_message_prompt', lang));
                    return;
                }
                try {
                    await loadUsers(); // Ensure we have the latest list of users
                    for (const u of Object.values(users)) {
                        if (u.step === 'DONE') { // Only send to completed profiles
                            try {
                                await bot.telegram.sendMessage(u.id, text);
                            } catch (msgError) {
                                console.error(`Failed to send message to user ${u.id}:`, msgError);
                                // Optionally, handle users who have blocked the bot by removing them.
                                // This requires more sophisticated error parsing for specific error codes.
                            }
                        }
                    }
                    await ctx.reply(getPhrase('announcement_sent', lang));
                } catch (e) {
                    console.error('Error sending announcement:', e);
                    await ctx.reply(getPhrase('error_sending_announcement', lang));
                }
                user.adminStep = 'ADMIN_PANEL';
                await saveUsers();
                await ctx.reply(getPhrase('admin_welcome', lang), adminPanelKeyboard(lang));
                return;
            case 'ADMIN_SEND_MESSAGE_ID':
                if (!users[text]) { // Check in-memory first
                    await ctx.reply(getPhrase('user_id_not_found', lang));
                    return;
                }
                // Verify actual existence in DB is a good idea if this is sensitive
                const targetUserForMsg = await db.collection('users').findOne({ id: text });
                if (!targetUserForMsg) {
                    await ctx.reply(getPhrase('user_id_not_found', lang));
                    return;
                }

                user.adminStep = 'ADMIN_SEND_MESSAGE_TEXT';
                user.adminTargetUserId = text;
                await saveUsers();
                await ctx.reply(getPhrase('message_to_send', lang));
                return;
            case 'ADMIN_SEND_MESSAGE_TEXT':
                if (!validateString(text)) {
                    await ctx.reply(getPhrase('message_to_send', lang));
                    return;
                }
                try {
                    await bot.telegram.sendMessage(user.adminTargetUserId, text);
                    await ctx.reply(getPhrase('message_sent_to_user', lang, user.adminTargetUserId));
                } catch (e) {
                    console.error('Error sending message:', e);
                    await ctx.reply(getPhrase('error_sending_message', lang));
                }
                user.adminStep = 'ADMIN_PANEL';
                user.adminTargetUserId = null;
                await saveUsers();
                await ctx.reply(getPhrase('admin_welcome', lang), adminPanelKeyboard(lang));
                return;
        }
    }

    // Handle user profile steps
    if (user.matchStep === 'MATCH_LOCATION_TYPED') {
        if (!validateString(text)) return ctx.reply(getPhrase("location_invalid", lang));
        user.matchLocation = text;
        user.matchStep = null;
        await saveUsers();
        showLocationMatchesForUser(ctx, user.matchLocation);
        return;
    }

    switch (user.step) {
        case 'NAME':
            if (!validateString(text)) return ctx.reply(getPhrase("name_invalid", lang));
            user.name = text;
            user.step = 'AGE';
            await saveUsers();
            return ctx.reply(getPhrase('age_prompt', lang), Markup.keyboard([[getPhrase('help', lang)]]).resize());
        case 'AGE':
            {
                const age = parseInt(text, 10);
                if (isNaN(age) || !validateAge(age)) return ctx.reply(getPhrase("age_invalid", lang));
                user.age = age;
                user.step = 'AGE_PRIVACY';
                await saveUsers();
                return ctx.reply(
                    getPhrase('age_privacy_prompt', lang),
                    Markup.inlineKeyboard([
                        [Markup.button.callback(getPhrase('yes', lang), 'age_visible_yes')],
                        [Markup.button.callback(getPhrase('no', lang), 'age_visible_no')],
                        [Markup.button.callback(getPhrase('help', lang), 'help_inline')],
                    ])
                );
            }
        case 'AGE_PRIVACY':
            return ctx.reply(getPhrase("age_visibility_buttons", lang), Markup.keyboard([[getPhrase('help', lang)]]).resize());
        case 'LOCATION_TYPED':
            if (!validateString(text)) return ctx.reply(getPhrase("location_invalid", lang));
            user.location = text;
            user.step = 'HOBBIES';
            await saveUsers();
            return ctx.reply(getPhrase('hobbies_prompt', lang), getHobbyKeyboard(user.hobbies, lang));
        case 'HOBBY_TYPED':
        case 'EDIT_HOBBY_TYPED':
            if (!validateString(text)) return ctx.reply(getPhrase('hobby_invalid', lang));
            if (user.hobbies.length >= 5) {
                user.step = user.step === 'EDIT_HOBBY_TYPED' ? 'EDIT_HOBBIES' : 'HOBBIES';
                await saveUsers();
                return ctx.reply(getPhrase('max_hobbies_reached', lang), getHobbyKeyboard(user.hobbies, lang));
            }
            user.hobbies.push(text);
            user.step = user.step === 'EDIT_HOBBY_TYPED' ? 'EDIT_HOBBIES' : 'HOBBIES';
            await saveUsers();
            await ctx.reply(`${getPhrase('added_hobby', lang)}${text}`, getHobbyKeyboard(user.hobbies, lang));
            return;
        case 'BIO':
            if (!validateString(text)) return ctx.reply(getPhrase("bio_invalid", lang));
            user.bio = text;
            if (ctx.from.username) {
                user.username = ctx.from.username;
                user.username_platform = 'telegram';
                user.username_platform_label = getPhrase('telegram', lang);
                user.step = 'PHOTO';
                await saveUsers();
                return ctx.reply(getPhrase('photo_prompt', lang));
            } else {
                user.step = 'CUSTOM_USERNAME';
                await saveUsers();
                return ctx.reply(getPhrase('no_telegram_username', lang));
            }
        case 'CUSTOM_USERNAME':
            if (!validateString(text)) return ctx.reply(getPhrase("username_prompt", lang));
            user.custom_username = text;
            user.step = 'USERNAME_PLATFORM';
            await saveUsers();
            return ctx.reply(
                getPhrase('username_platform_prompt', lang),
                Markup.inlineKeyboard(PLATFORMS.map((p) => [Markup.button.callback(p.label, `username_source_${p.key}`)]).concat([[Markup.button.callback(getPhrase('help', lang), 'help_inline')]]))
            );
        case 'CUSTOM_PLATFORM':
            if (!validateString(text)) return ctx.reply(getPhrase("platform_name_invalid", lang));
            user.username_platform = text;
            user.username_platform_label = text;
            user.step = 'PHOTO';
            await saveUsers();
            return ctx.reply(getPhrase('photo_prompt', lang));
        case 'EDIT_NAME':
            if (!validateString(text)) return ctx.reply(getPhrase('name_invalid', lang));
            user.name = text;
            user.step = 'EDITING';
            await saveUsers();
            return ctx.reply(getPhrase('name_updated', lang), editProfileKeyboard(user));
        case 'EDIT_BIO':
            if (!validateString(text)) return ctx.reply(getPhrase('bio_invalid', lang));
            user.bio = text;
            user.step = 'EDITING';
            await saveUsers();
            return ctx.reply(getPhrase('bio_updated', lang), editProfileKeyboard(user));
        case 'EDIT_USERNAME':
            if (!validateString(text)) return ctx.reply(getPhrase('username_prompt', lang));
            user.custom_username = text;
            user.step = 'EDIT_USERNAME_PLATFORM';
            await saveUsers();
            return ctx.reply(
                getPhrase('username_platform_prompt', lang),
                Markup.inlineKeyboard(PLATFORMS.map((p) => [Markup.button.callback(p.label, `set_edit_username_source_${p.key}`)]).concat([[Markup.button.callback(getPhrase('help', lang), 'help_inline')]]))
            );
        case 'EDIT_CUSTOM_PLATFORM':
            if (!validateString(text)) return ctx.reply(getPhrase('platform_name_invalid', lang));
            user.username_platform = text;
            user.username_platform_label = text;
            user.step = 'EDITING';
            await saveUsers();
            return ctx.reply(getPhrase('platform_updated', lang), editProfileKeyboard(user));
        case 'EDIT_LOCATION_TYPED':
            if (!validateString(text)) return ctx.reply(getPhrase("location_invalid", lang));
            user.location = text;
            user.step = 'EDITING';
            await saveUsers();
            await ctx.reply(`${getPhrase('location_updated', lang)}${user.location}`, editProfileKeyboard(user));
            return;
        default:
            if (!['DONE', 'EDITING'].includes(user.step)) {
                return ctx.reply(getPhrase("continue_profile", lang));
            }
            return ctx.reply(getPhrase('unknown_input', lang), mainMenuKeyboard(user));
    }
});

bot.action('age_visible_yes', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'AGE_PRIVACY') return;
    const lang = user.language;
    user.age_visible = true;
    user.step = 'LOCATION';
    await saveUsers();
    ctx.editMessageText(getPhrase('age_visible_set', lang));
    ctx.reply(
        getPhrase('select_location_prompt', lang),
        Markup.inlineKeyboard([
            ...LOCATIONS.map((loc) => [Markup.button.callback(loc, `location_${loc.replace(/ /g, '_')}`)]),
            [Markup.button.callback(getPhrase('location_other', lang), 'location_other')],
            [Markup.button.callback(getPhrase('help', lang), 'help_inline')],
        ])
    );
});

bot.action('age_visible_no', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'AGE_PRIVACY') return;
    const lang = user.language;
    user.age_visible = false;
    user.step = 'LOCATION';
    await saveUsers();
    ctx.editMessageText(getPhrase('age_not_visible_set', lang));
    ctx.reply(
        getPhrase('select_location_prompt', lang),
        Markup.inlineKeyboard([
            ...LOCATIONS.map((loc) => [Markup.button.callback(loc, `location_${loc.replace(/ /g, '_')}`)]),
            [Markup.button.callback(getPhrase('location_other', lang), 'location_other')],
            [Markup.button.callback(getPhrase('help', lang), 'help_inline')],
        ])
    );
});

LOCATIONS.forEach((loc) => {
    bot.action(`location_${loc.replace(/ /g, '_')}`, async (ctx) => {
        ctx.answerCbQuery();
        const user = users[ctx.from.id];
        if (!user || user.step !== 'LOCATION') return;
        const lang = user.language;
        user.location = loc;
        user.step = 'HOBBIES';
        await saveUsers();
        ctx.editMessageText(`${getPhrase('location_selected', lang)}${loc}`);
        ctx.reply(getPhrase('hobbies_prompt', lang), getHobbyKeyboard(user.hobbies, lang));
    });
});

bot.action('location_other', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'LOCATION') return;
    const lang = user.language;
    user.step = 'LOCATION_TYPED';
    await saveUsers();
    ctx.reply(getPhrase("location_typed_prompt", lang));
});

bot.action(/toggle_hobby_(.+)/, async (ctx) => {
    ctx.answerCbQuery();
    const hobbyRaw = ctx.match[1];
    const hobby = HOBBIES.find((h) => h.replace(/[^\w]/g, '') === hobbyRaw) || hobbyRaw;
    const user = users[ctx.from.id];
    if (!user || (user.step !== 'HOBBIES' && user.step !== 'EDIT_HOBBIES')) return;
    const lang = user.language;
    if (user.hobbies.includes(hobby)) {
        user.hobbies = user.hobbies.filter((h) => h !== hobby);
        await saveUsers();
        await ctx.editMessageReplyMarkup(getHobbyKeyboard(user.hobbies, lang).reply_markup);
    } else {
        if (user.hobbies.length >= 5) {
            return ctx.reply(getPhrase('max_hobbies_reached', lang));
        }
        user.hobbies.push(hobby);
        await saveUsers();
        await ctx.editMessageReplyMarkup(getHobbyKeyboard(user.hobbies, lang).reply_markup);
    }
});

bot.action('hobby_other', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || (user.step !== 'HOBBIES' && user.step !== 'EDIT_HOBBIES')) return;
    const lang = user.language;
    if (user.hobbies.length >= 5) {
        return ctx.reply(getPhrase('max_hobbies_reached', lang));
    }
    user.step = user.step === 'EDIT_HOBBIES' ? 'EDIT_HOBBY_TYPED' : 'HOBBY_TYPED';
    await saveUsers();
    ctx.reply(getPhrase('hobby_prompt', lang)); // Re-using for hobby input
});

bot.action('hobbies_done', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || (user.step !== 'HOBBIES' && user.step !== 'EDIT_HOBBIES')) return;
    const lang = user.language;
    if (!user.hobbies.length) return ctx.reply(getPhrase('select_at_least_one_hobby', lang));
    user.step = user.step === 'EDIT_HOBBIES' ? 'EDITING' : 'BIO';
    await saveUsers();
    await ctx.editMessageText(`${getPhrase('selected_hobbies', lang)}${user.hobbies.join(', ')}`);
    if (user.step === 'EDITING') return ctx.reply(getPhrase('select_field_to_edit', lang), editProfileKeyboard(user)); // Re-using for general edit prompt
    return ctx.reply(getPhrase('bio_prompt', lang));
});

PLATFORMS.forEach(({ key, label }) => {
    bot.action(`username_source_${key}`, async (ctx) => {
        ctx.answerCbQuery();
        const user = users[ctx.from.id];
        if (!user || user.step !== 'USERNAME_PLATFORM') return;
        const lang = user.language;
        if (key === 'other') {
            user.step = 'CUSTOM_PLATFORM';
            await saveUsers();
            return ctx.reply(getPhrase('platform_name_prompt', lang));
        }
        user.username_platform = key;
        user.username_platform_label = label;
        user.step = 'PHOTO';
        await saveUsers();
        ctx.editMessageText(`${getPhrase('username_display', lang)}${user.custom_username} (${label})`);
        ctx.reply(getPhrase('photo_prompt', lang));
    });

    bot.action(`set_edit_username_source_${key}`, async (ctx) => {
        ctx.answerCbQuery();
        const user = users[ctx.from.id];
        if (!user || user.step !== 'EDIT_USERNAME_PLATFORM') return;
        const lang = user.language;
        if (key === 'other') {
            user.step = 'EDIT_CUSTOM_PLATFORM';
            await saveUsers();
            return ctx.reply(getPhrase('platform_name_prompt', lang));
        }
        user.username_platform = key;
        user.username_platform_label = label;
        user.step = 'EDITING';
        await saveUsers();
        ctx.editMessageText(`${getPhrase('username_display', lang)}${user.custom_username} (${label})`);
        ctx.reply(getPhrase('select_field_to_edit', lang), editProfileKeyboard(user));
    });
});

['edit_name', 'edit_hobbies', 'edit_bio', 'edit_photo', 'edit_user_platform', 'edit_location'].forEach((action) => {
    bot.action(action, async (ctx) => {
        ctx.answerCbQuery();
        const user = users[ctx.from.id];
        if (!user) return;
        const lang = user.language;
        switch (action) {
            case 'edit_name':
                user.step = 'EDIT_NAME';
                ctx.reply(getPhrase('enter_new_name', lang));
                break;
            case 'edit_hobbies':
                user.step = 'EDIT_HOBBIES';
                ctx.reply(getPhrase('hobbies_prompt', lang), getHobbyKeyboard(user.hobbies, lang));
                break;
            case 'edit_bio':
                user.step = 'EDIT_BIO';
                ctx.reply(getPhrase('enter_new_bio', lang));
                break;
            case 'edit_photo':
                user.step = 'EDIT_PHOTO';
                ctx.reply(getPhrase('photo_prompt', lang)); // Re-using for new photo
                break;
            case 'edit_user_platform':
                user.step = 'EDIT_USERNAME';
                ctx.reply(getPhrase('enter_new_username', lang));
                break;
            case 'edit_location':
                user.step = 'EDIT_LOCATION';
                ctx.reply(
                    getPhrase('enter_new_location', lang),
                    Markup.inlineKeyboard([
                        ...LOCATIONS.map((loc) => [Markup.button.callback(loc, `set_edit_location_${loc.replace(/ /g, '_')}`)]),
                        [Markup.button.callback(getPhrase('location_other', lang), 'set_edit_location_other')],
                        [Markup.button.callback(getPhrase('help', lang), 'help_inline')],
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
    const lang = user.language;
    user.step = 'DONE';
    await saveUsers();
    ctx.answerCbQuery(getPhrase('edit_complete', lang));
    ctx.reply(getPhrase('edit_complete', lang), mainMenuKeyboard(user));
});

LOCATIONS.forEach((loc) => {
    bot.action(`set_edit_location_${loc.replace(/ /g, '_')}`, async (ctx) => {
        ctx.answerCbQuery();
        const user = users[ctx.from.id];
        if (!user || user.step !== 'EDIT_LOCATION') return;
        const lang = user.language;
        user.location = loc;
        user.step = 'EDITING';
        await saveUsers();
        ctx.editMessageText(`${getPhrase('location_updated', lang)}${loc}`);
        ctx.reply(getPhrase('select_field_to_edit', lang), editProfileKeyboard(user));
    });
});

bot.action('set_edit_location_other', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'EDIT_LOCATION') return;
    const lang = user.language;
    user.step = 'EDIT_LOCATION_TYPED';
    await saveUsers();
    ctx.reply(getPhrase("location_typed_prompt", lang)); // Re-using for new location input
});

bot.action('begin_signup', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!botState.active && !adminList.includes(userId)) {
        return ctx.reply(getPhrase('bot_off_message', 'en'));
    }
    users[userId] = { id: userId, step: 'SELECT_LANGUAGE', hobbies: [], language: 'en' }; // Default to English initially
    await saveUsers();
    await ctx.answerCbQuery();
    return ctx.reply(
        getPhrase('select_language', 'en'),
        Markup.inlineKeyboard([
            [Markup.button.callback('English 🇬🇧', 'set_lang_en')],
            [Markup.button.callback('አማርኛ 🇪🇹', 'set_lang_am')]
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
