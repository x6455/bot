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
        set_telegram_username_prompt: '⚠️ To continue, you must set a public username in your Telegram settings (Settings > Edit profile > Username). Once you have set it, please send your bio again.',
        photo_prompt: '📸 Please send your profile picture:',
        no_photo_received: '🚫 No photo received. Please try again.',
        photo_updated: '📸 Photo updated!',
        profile_complete: '👍 Profile complete! Use the menu below.',
        new_match_found: "👫 New match found!. Tap 👀 See matches to check.",
        see_matches: '👀 See matches',
        complete_profile_first: '⚠️ Please complete your profile first!',
        finish_editing_profile: '✏️ Please finish editing your profile before viewing matches:',
        where_to_match_location: '🌍 Where do you want your match to be from? Select a location or type your own.',
        any_location: '🌐 Any Location',
        daily_match_limit: '🔔 You’ve reached the daily limit of 3 matches. Try again tomorrow or choose a different location!',
        no_matches_found: '🔔 No matches found in that location. Try another or check back later.',
        no_more_new_matches: '🔔 No more new matches available for today in that location. Come back tomorrow for more or try a different location!',
        here_are_your_matches: '👫 Here are your matches:',
        see_contact: '📞 See contact',
        ice_breaker: '💬 Ice breaker',
        user_contact_not_found: '❌ Could not find user contact.',
        contact_info: '📞 Contact on Telegram:',
        ice_breaker_for: '💬 Ice breaker for ',
        show_profile: '👤 My profile',
        edit_profile: '✏️ Edit profile',
        delete_profile: '🗑️ Delete profile',
        help: '💬 Help',
        help_text: 'ℹ️ Complete your profile by following prompts and tap 👀 See matches to find your match!. For further help contact owner @zima6455',
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
        continue_profile: "🤖 Let's continue your profile creation. Select fields to complete your profile.",
        enter_new_name: '📝 Enter your new name:',
        name_updated: '📝 Name updated!',
        enter_new_bio: '💡 Enter your new bio:',
        bio_updated: '💡 Bio updated!',
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
        not_available: 'N/A',
        profile_setup: '📋 Complete your profile setup',
        setup_progress: 'Progress: ',
        setup_complete: '✅ Profile Complete!',
        setup_incomplete: '❌ Please complete all required fields to finish your profile.',
        field_required: 'This field is required to complete your profile.',
        all_fields_completed: '🎉 Great! You\'ve completed all profile fields. Your profile is now active!'
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
        hobbies_prompt: '🏷️ ማድረግ የሚያስድስቶትን ወይም የ የትርፍ ግዜ ማሳለፊያ ተግባር ይምረጡ (ለመምረጥ ይጫኑ፣ ሲጨርሱ ጨርሻለሁ ይጫኑ):',
        hobby_other: 'ሌላ...',
        hobbies_done: 'ጨርሻለሁ',
        hobby_invalid: '🏷️ እባክዎ ትክክለኛ የትርፍ ጊዜ ማሳለፊያ ያስገቡ።',
        max_hobbies_reached: '❌ ቢበዛ 5 የትርፍ ጊዜ ማሳለፊያዎች ብቻ። ሌላ ለመጨመር አንዱን ያጥፉ።',
        added_hobby: '🏷️ የተጨመረ የትርፍ ጊዜ ማሳለፊያ: ',
        select_at_least_one_hobby: '🏷️ ቢያንስ አንድ የትርፍ ጊዜ ማሳለፊያ ይምረጡ!',
        selected_hobbies: '🏷️ የተመረጡ የትርፍ ጊዜ ማሳለፊያዎች: ',
        bio_prompt: '💡 እራሶን በአጭሩ ይግለጹ  :',
        bio_invalid: '💡 እባክዎ እራሶን በአጭሩ ይግለጹ።',
        set_telegram_username_prompt: '⚠️ ለመቀጠል በቴሌግራም መተግበሪያዎ ላይ username ሊኖርዎት ይገባል (Settings > Edit profile > Username)። username ካስተካከሉ በኋላ፣ እባክዎ የእርስዎን bio እንደገና ያስገቡ።',
        photo_prompt: '📸 እባክዎ የግል ፎቶ ያስገቡ :',
        no_photo_received: '🚫 ምንም ፎቶ አልተቀበልንም። እባክዎ እንደገና ይሞክሩ።',
        photo_updated: '📸 ፎቶ ተስተካክሏል!',
        profile_complete: '👍 ፕሮፋይልዎ ተጠናቋል! ከታች ያለውን ሜኑ ይጠቀሙ።',
        new_match_found: "👫 አዲስ ኣጋር ተገኝቷል! አንድ አዲስ ሰው ፕሮፋይሉን አጠናቅቋል። ለማየት 👀 See matches ይጫኑ።",
        see_matches: '👀 አጋርዎ ይመልከቱ',
        complete_profile_first: '⚠️ እባክዎ መጀመሪያ ፕሮፋይልዎን ይሙሉ።',
        finish_editing_profile: '✏️ አጋሮን ከማየትዎ በፊት ፕሮፋይልዎን ማስተካከል ይጨርሱ:',
        where_to_match_location: '🌍 አጋርዎ ከየት እንዲሆን ይፈልጋሉ? አካባቢ ይምረጡ ወይም የራስዎን ይጻፉ።',
        any_location: '🌐 ማንኛውም አካባቢ',
        daily_match_limit: '🔔 በቀን ማየት የሚፈቀደው 3 ኣካውንት ብቻ ነው  ። ነገ እንደገና ይሞክሩ !',
        no_matches_found: '🔔 በዚያ አካባቢ ምንም አጋር  አልተገኘም። ሌላ ይሞክሩ ወይም በኋላ ደግመው ይመልከቱ።',
        no_more_new_matches: '🔔 ለዛሬ ተጨማሪ አዳዲስ አጋሮች  የሉም። ለተጨማሪ ነገ ይመለሱ !',
        here_are_your_matches: '👫 አድሎን ይሞክሩ:',
        see_contact: '📞 ለመተዋወቅ መረጃ ይመልከቱ',
        ice_breaker: '💬 ለመተዋወቅ የሚረዱ ጨዋታ ማስጀመርያዎች',
        user_contact_not_found: '❌ የተጠቃሚ መረጃ ማግኘት አልተቻለም።',
        contact_info: '📞 በቴሌግራም ያግኙ:',
        ice_breaker_for: '💬 ለለመተዋወቅ የሚረዱ ጨዋታ ማስጀመርያዎች ',
        show_profile: '👤 ፕሮፋይል አሳይ',
        edit_profile: '✏️ ፕሮፋይል አስተካክል',
        delete_profile: '🗑️ ፕሮፋይል ሰርዝ',
        help: '💬 እገዛ',
        help_text: 'ℹ️ ፕሮፋይልዎን በማስገባት እና 👀 See matches በመጫን አጋርዎን ያግኙ!',
        name_display: '👤 ስም: ',
        gender_display: '🚻 ፆታ: ',
        age_display: '🎂 ዕድሜ: ',
        location_display: '📍 አካባቢ: ',
        hobbies_display: '🏷️ የትርፍ ጊዜ ማሳለፊያዎች: ',
        bio_display: '💡 ባዮ: ',
        username_display: '🔗 የተጠቃሚ ስም: ',
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
        enter_new_location: '📍 አዲስ አካባቢዎን ይምረጡ:',
        edit_complete: '✅ ማስተካከያ ተጠናቋል! ዋናውን ሜኑ ይጠቀሙ:',
        unauthorized: '❌ የአስተዳዳሪ ፓነልን ለመጠቀም ፍቃድ የለዎትም። የቴሌግራም መታወቂያዎ በአስተዳዳሪ ዝርዝር ውስጥ የለም።',
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
        not_available: 'አልተዘጋጀም',
        profile_setup: '📋 የእርስዎን ፕሮፋይል ማሟላት',
        setup_progress: 'የተከናውኑት: ',
        setup_complete: '✅ ፕሮፋይልዎ ተጠናቋል!',
        setup_incomplete: '❌ ፕሮፋይልዎን ለማጠናቀቅ ሁሉንም አስፈላጊ መስኮች ያሙሉ።',
        field_required: 'ይህ መስክ የተጠበቀ ነው።',
        all_fields_completed: '🎉 ደስ ብሎኛል! ሁሉንም መስኮች አሙላችሁ። ፕሮፋይልዎ አሁን ክትትል ውስጥ ነው!'
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
    '🎲 Chess / kards ',
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
const LOCATIONS = ['Addis Ababa', 'Mekelle', 'Hawassa', 'Gonder', 'Adama'];
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
// Profile setup keyboard - shows all fields at once
function profileSetupKeyboard(user, lang = 'en') {
    // Calculate completion status
    const requiredFields = ['name', 'gender', 'age', 'location', 'hobbies', 'bio', 'photo'];
    const completedFields = requiredFields.filter(field => {
        if (field === 'hobbies') return user.hobbies && user.hobbies.length > 0;
        if (field === 'photo') return user.photo && user.photo.length > 0;
        return user[field] !== undefined && user[field] !== null && user[field] !== '';
    });
    
    const completionRate = Math.round((completedFields.length / requiredFields.length) * 100);
    
    // Create buttons for each field
    const buttons = [
        [Markup.button.callback(
            `${user.name ? '✅' : '📋'} ${getPhrase('name_display', lang)}${user.name || getPhrase('not_set', lang)}`,
            'setup_name'
        )],
        [Markup.button.callback(
            `${user.gender ? '✅' : '📋'} ${getPhrase('gender_display', lang)}${user.gender ? 
                (user.gender === 'male' ? getPhrase('male', lang) : getPhrase('female', lang)) : 
                getPhrase('not_set', lang)}`,
            'setup_gender'
        )],
        [Markup.button.callback(
            `${user.age ? '✅' : '📋'} ${getPhrase('age_display', lang)}${user.age || getPhrase('not_set', lang)}`,
            'setup_age'
        )],
        [Markup.button.callback(
            `${user.location ? '✅' : '📋'} ${getPhrase('location_display', lang)}${user.location || getPhrase('not_set', lang)}`,
            'setup_location'
        )],
        [Markup.button.callback(
            `${(user.hobbies && user.hobbies.length > 0) ? '✅' : '📋'} ${getPhrase('hobbies_display', lang)}${(user.hobbies && user.hobbies.length > 0) ? user.hobbies.join(', ') : getPhrase('none', lang)}`,
            'setup_hobbies'
        )],
        [Markup.button.callback(
            `${user.bio ? '✅' : '📋'} ${getPhrase('bio_display', lang)}${user.bio ? user.bio.substring(0, 20) + '...' : getPhrase('not_set', lang)}`,
            'setup_bio'
        )],
        [Markup.button.callback(
            `${user.photo ? '✅' : '📋'} ${getPhrase('photo_prompt', lang)}`,
            'setup_photo'
        )]
    ];
    
    // Add completion status and finish button
    buttons.push([
        Markup.button.callback(
            `${getPhrase('setup_progress', lang)}${completionRate}%`, 
            'setup_progress'
        )
    ]);
    
    if (completedFields.length === requiredFields.length) {
        buttons.push([
            Markup.button.callback('🎉 ' + getPhrase('setup_complete', lang), 'setup_complete')
        ]);
    } else {
        buttons.push([
            Markup.button.callback('❌ ' + getPhrase('setup_incomplete', lang), 'setup_incomplete')
        ]);
    }
    
    buttons.push([
        Markup.button.callback(getPhrase('help', lang), 'help_inline')
    ]);
    
    return Markup.inlineKeyboard(buttons);
}
// Gender selection keyboard
function getGenderKeyboard(lang = 'en') {
    return Markup.inlineKeyboard([
        [Markup.button.callback(getPhrase('male', lang), 'gender_selected_male')],
        [Markup.button.callback(getPhrase('female', lang), 'gender_selected_female')],
        [Markup.button.callback(getPhrase('help', lang), 'help_inline')],
    ]);
}
// Age privacy keyboard
function getAgePrivacyKeyboard(lang = 'en') {
    return Markup.inlineKeyboard([
        [Markup.button.callback(getPhrase('yes', lang), 'age_visible_yes')],
        [Markup.button.callback(getPhrase('no', lang), 'age_visible_no')],
        [Markup.button.callback(getPhrase('help', lang), 'help_inline')],
    ]);
}
// Location selection keyboard
function getLocationKeyboard(lang = 'en') {
    return Markup.inlineKeyboard([
        ...LOCATIONS.map((loc) => [Markup.button.callback(loc, `location_selected_${loc.replace(/ /g, '_')}`)]),
        [Markup.button.callback(getPhrase('location_other', lang), 'location_other')],
        [Markup.button.callback(getPhrase('help', lang), 'help_inline')],
    ]);
}
// Validate profile completion
function isProfileComplete(user) {
    return user.name && 
           user.gender && 
           user.age && 
           user.location && 
           user.hobbies && user.hobbies.length > 0 && 
           user.bio && 
           user.photo;
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
    const lang = users[userId] ? users[userId].language : 'en';
    if (!adminList.includes(userId)) {
        return ctx.reply(getPhrase('unauthorized', lang));
    }
    users[userId] = users[userId] || { id: userId, step: 'DONE', hobbies: [], language: 'en' }; // Ensure admin has a basic user object
    users[userId].adminStep = 'ADMIN_PANEL';
    await saveUsers();
    return ctx.reply(getPhrase('admin_welcome', lang), adminPanelKeyboard(lang));
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
            return `ID: ${u.id}
${getPhrase('name_display', u_lang)}: ${u.name || getPhrase('not_available', u_lang)}
` +
                   `${getPhrase('gender_display', u_lang)}: ${u.gender || getPhrase('not_available', u_lang)}
` +
                   `${getPhrase('age_display', u_lang)}: ${u.age_visible !== false ? (u.age || getPhrase('not_available', u_lang)) : getPhrase('hidden', u_lang)}
` +
                   `${getPhrase('location_display', u_lang)}: ${u.location || getPhrase('not_available', u_lang)}
` +
                   `${getPhrase('hobbies_display', u_lang)}: ${(u.hobbies || []).join(', ') || getPhrase('none', u_lang)}`;
        })
        .join('
');
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
    const statsText = `${getPhrase('stats', lang)}
${getPhrase('total_users', lang)}${Object.keys(users).length}
${getPhrase('users_by_location', lang)}${Object.entries(locationStats).map(([loc, count]) => `${loc}: ${count}`).join(', ') || getPhrase('none', lang)}`;
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
        users[userId] = { 
            id: userId, 
            step: 'SETUP_PROFILE', 
            hobbies: [], 
            language: 'en',
            setupStep: null
        };
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
    
    // Check profile completion
    if (user.step === 'DONE') {
        return ctx.reply(getPhrase('welcome_back', lang), mainMenuKeyboard(user));
    } else {
        // Show profile setup interface
        await ctx.reply(getPhrase('profile_setup', lang), profileSetupKeyboard(user, lang));
    }
});
bot.action('set_lang_en', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'SETUP_PROFILE') return;
    user.language = 'en';
    user.step = 'SETUP_PROFILE';
    await saveUsers();
    await ctx.editMessageText(getPhrase('language_set', 'en'));
    
    // Show profile setup interface
    await ctx.reply(getPhrase('profile_setup', 'en'), profileSetupKeyboard(user, 'en'));
});
bot.action('set_lang_am', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'SETUP_PROFILE') return;
    user.language = 'am';
    user.step = 'SETUP_PROFILE';
    await saveUsers();
    await ctx.editMessageText(getPhrase('language_set', 'am'));
    
    // Show profile setup interface
    await ctx.reply(getPhrase('profile_setup', 'am'), profileSetupKeyboard(user, 'am'));
});
// Profile setup actions
bot.action('setup_name', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'SETUP_PROFILE') return;
    const lang = user.language;
    user.setupStep = 'NAME';
    await saveUsers();
    await ctx.reply(getPhrase('name_prompt', lang));
});
bot.action('setup_gender', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'SETUP_PROFILE') return;
    const lang = user.language;
    user.setupStep = 'GENDER';
    await saveUsers();
    await ctx.editMessageText(getPhrase('gender_prompt', lang), getGenderKeyboard(lang));
});
bot.action('setup_age', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'SETUP_PROFILE') return;
    const lang = user.language;
    user.setupStep = 'AGE';
    await saveUsers();
    await ctx.reply(getPhrase('age_prompt', lang));
});
bot.action('setup_location', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'SETUP_PROFILE') return;
    const lang = user.language;
    user.setupStep = 'LOCATION';
    await saveUsers();
    await ctx.editMessageText(getPhrase('select_location_prompt', lang), getLocationKeyboard(lang));
});
bot.action('setup_hobbies', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'SETUP_PROFILE') return;
    const lang = user.language;
    user.setupStep = 'HOBBIES';
    await saveUsers();
    await ctx.editMessageText(getPhrase('hobbies_prompt', lang), getHobbyKeyboard(user.hobbies, lang));
});
bot.action('setup_bio', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'SETUP_PROFILE') return;
    const lang = user.language;
    user.setupStep = 'BIO';
    await saveUsers();
    await ctx.reply(getPhrase('bio_prompt', lang));
});
bot.action('setup_photo', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'SETUP_PROFILE') return;
    const lang = user.language;
    user.setupStep = 'PHOTO';
    await saveUsers();
    await ctx.reply(getPhrase('photo_prompt', lang));
});
bot.action('setup_progress', async (ctx) => {
    ctx.answerCbQuery();
    // Do nothing, just acknowledge the click
});
bot.action('setup_complete', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'SETUP_PROFILE') return;
    const lang = user.language;
    
    // Verify all required fields are filled
    if (isProfileComplete(user)) {
        user.step = 'DONE';
        await saveUsers();
        await ctx.editMessageText(getPhrase('all_fields_completed', lang));
        await ctx.reply(getPhrase('profile_complete', lang), mainMenuKeyboard(user));
        
        // Notify potential matches
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
    } else {
        await ctx.editMessageReplyMarkup(profileSetupKeyboard(user, lang).reply_markup);
    }
});
bot.action('setup_incomplete', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.step !== 'SETUP_PROFILE') return;
    const lang = user.language;
    await ctx.reply(getPhrase('setup_incomplete', lang));
});
// Gender selection
bot.action('gender_selected_male', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.setupStep !== 'GENDER') return;
    const lang = user.language;
    user.gender = 'male';
    user.setupStep = null;
    await saveUsers();
    await ctx.editMessageText(getPhrase('gender_set_male', lang));
    await ctx.reply(getPhrase('profile_setup', lang), profileSetupKeyboard(user, lang));
});
bot.action('gender_selected_female', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.setupStep !== 'GENDER') return;
    const lang = user.language;
    user.gender = 'female';
    user.setupStep = null;
    await saveUsers();
    await ctx.editMessageText(getPhrase('gender_set_female', lang));
    await ctx.reply(getPhrase('profile_setup', lang), profileSetupKeyboard(user, lang));
});
// Age privacy selection
bot.action('age_visible_yes', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.setupStep !== 'AGE_PRIVACY') return;
    const lang = user.language;
    user.age_visible = true;
    user.setupStep = null;
    await saveUsers();
    await ctx.editMessageText(getPhrase('age_visible_set', lang));
    await ctx.reply(getPhrase('profile_setup', lang), profileSetupKeyboard(user, lang));
});
bot.action('age_visible_no', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.setupStep !== 'AGE_PRIVACY') return;
    const lang = user.language;
    user.age_visible = false;
    user.setupStep = null;
    await saveUsers();
    await ctx.editMessageText(getPhrase('age_not_visible_set', lang));
    await ctx.reply(getPhrase('profile_setup', lang), profileSetupKeyboard(user, lang));
});
// Location selection
LOCATIONS.forEach((loc) => {
    bot.action(`location_selected_${loc.replace(/ /g, '_')}`, async (ctx) => {
        ctx.answerCbQuery();
        const user = users[ctx.from.id];
        if (!user || user.setupStep !== 'LOCATION') return;
        const lang = user.language;
        user.location = loc;
        user.setupStep = null;
        await saveUsers();
        await ctx.editMessageText(`${getPhrase('location_selected', lang)}${loc}`);
        await ctx.reply(getPhrase('profile_setup', lang), profileSetupKeyboard(user, lang));
    });
});
bot.action('location_other', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.setupStep !== 'LOCATION') return;
    const lang = user.language;
    user.setupStep = 'LOCATION_TYPED';
    await saveUsers();
    ctx.reply(getPhrase("location_typed_prompt", lang));
});
// Hobby selection
bot.action(/toggle_hobby_(.+)/, async (ctx) => {
    ctx.answerCbQuery();
    const hobbyRaw = ctx.match[1];
    const hobby = HOBBIES.find((h) => h.replace(/[^\w]/g, '') === hobbyRaw) || hobbyRaw;
    const user = users[ctx.from.id];
    if (!user || user.setupStep !== 'HOBBIES') return;
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
    if (!user || user.setupStep !== 'HOBBIES') return;
    const lang = user.language;
    if (user.hobbies.length >= 5) {
        return ctx.reply(getPhrase('max_hobbies_reached', lang));
    }
    user.setupStep = 'HOBBY_TYPED';
    await saveUsers();
    ctx.reply(getPhrase('hobby_prompt', lang)); // Re-using for hobby input
});
bot.action('hobbies_done', async (ctx) => {
    ctx.answerCbQuery();
    const user = users[ctx.from.id];
    if (!user || user.setupStep !== 'HOBBIES') return;
    const lang = user.language;
    if (!user.hobbies.length) return ctx.reply(getPhrase('select_at_least_one_hobby', lang));
    user.setupStep = null;
    await saveUsers();
    await ctx.editMessageText(`${getPhrase('selected_hobbies', lang)}${user.hobbies.join(', ')}`);
    await ctx.reply(getPhrase('profile_setup', lang), profileSetupKeyboard(user, lang));
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
    
    // Save photo
    user.photo = photos[photos.length - 1].file_id;
    
    // Check if we're in setup mode
    if (user.setupStep === 'PHOTO') {
        user.setupStep = null;
        await saveUsers();
        await ctx.reply(getPhrase('photo_updated', lang));
        await ctx.reply(getPhrase('profile_setup', lang), profileSetupKeyboard(user, lang));
        return;
    }
    
    // Otherwise, it's a profile photo update
    await saveUsers();
    await ctx.reply(getPhrase('photo_updated', lang), mainMenuKeyboard(user));
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
    if (history.ids.length >= 3) {
        return ctx.reply(getPhrase('daily_match_limit', lang), mainMenuKeyboard(user));
    }
    await loadUsers();
    let matches = findMatches(user, location).filter(m => !history.ids.includes(m.id));
    matches = shuffleArray(matches).slice(0, 3 - history.ids.length); // Limit to remaining matches (max 3)
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
    if (!match || match.step !== 'DONE' || !match.username) {
        return ctx.reply(getPhrase('user_contact_not_found', lang));
    }
    ctx.reply(`${getPhrase('contact_info', lang)} @${match.username}`);
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
    ctx.reply(`${getPhrase('ice_breaker_for', lang)}${match.name}:
"${iceBreaker}"`);
});
bot.hears(Object.values(phrases).map(p => p.show_profile), async (ctx) => {
    const user = users[ctx.from.id];
    const lang = user.language;
    if (!user || user.step !== 'DONE') return ctx.reply(getPhrase('complete_profile_first', lang));
    if (user.step === 'EDITING') return ctx.reply(getPhrase('finish_editing_profile', lang), editProfileKeyboard(user));
    let caption = `${getPhrase('name_display', lang)}${user.name}
` +
        `${getPhrase('gender_display', lang)}${user.gender || getPhrase('not_set', lang)}
` +
        `${getPhrase('age_display', lang)}${user.age || getPhrase('not_set', lang)}
` +
        `${getPhrase('location_display', lang)}${user.location || getPhrase('not_set', lang)}
` +
        `${getPhrase('hobbies_display', lang)}${(user.hobbies || []).join(', ') || getPhrase('none', lang)}
` +
        `${getPhrase('bio_display', lang)}${user.bio || ''}`;
    if (user.username) {
        caption += `
${getPhrase('username_display', lang)}@${user.username}`;
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
    if (user.setupStep === 'LOCATION_TYPED') {
        if (!validateString(text)) return ctx.reply(getPhrase("location_invalid", lang));
        user.location = text;
        user.setupStep = null;
        await saveUsers();
        await ctx.reply(getPhrase('profile_setup', lang), profileSetupKeyboard(user, lang));
        return;
    }
    if (user.setupStep === 'HOBBY_TYPED') {
        if (!validateString(text)) return ctx.reply(getPhrase('hobby_invalid', lang));
        if (user.hobbies.length >= 5) {
            user.setupStep = null;
            await saveUsers();
            return ctx.reply(getPhrase('max_hobbies_reached', lang), getHobbyKeyboard(user.hobbies, lang));
        }
        user.hobbies.push(text);
        user.setupStep = null;
        await saveUsers();
        await ctx.reply(`${getPhrase('added_hobby', lang)}${text}`);
        await ctx.reply(getPhrase('profile_setup', lang), profileSetupKeyboard(user, lang));
        return;
    }
    // Handle regular profile setup steps
    switch (user.setupStep) {
        case 'NAME':
            if (!validateString(text)) return ctx.reply(getPhrase("name_invalid", lang));
            user.name = text;
            user.setupStep = null;
            await saveUsers();
            await ctx.reply(getPhrase('profile_setup', lang), profileSetupKeyboard(user, lang));
            return;
        case 'AGE':
            {
                const age = parseInt(text, 10);
                if (isNaN(age) || !validateAge(age)) return ctx.reply(getPhrase("age_invalid", lang));
                user.age = age;
                user.setupStep = 'AGE_PRIVACY';
                await saveUsers();
                return ctx.reply(
                    getPhrase('age_privacy_prompt', lang),
                    getAgePrivacyKeyboard(lang)
                );
            }
        case 'BIO':
            if (!validateString(text)) return ctx.reply(getPhrase("bio_invalid", lang));
            user.bio = text;
            user.setupStep = null;
            await saveUsers();
            await ctx.reply(getPhrase('profile_setup', lang), profileSetupKeyboard(user, lang));
            return;
        default:
            if (user.step === 'SETUP_PROFILE' && !user.setupStep) {
                return ctx.reply(getPhrase("continue_profile", lang), profileSetupKeyboard(user, lang));
            }
            return ctx.reply(getPhrase('unknown_input', lang), mainMenuKeyboard(user));
    }
});
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
    return `${getPhrase('name_display', lang)}${match.name}
` +
        (match.age_visible !== false ? `${getPhrase('age_display', lang)}${match.age}
` : '') +
        `${getPhrase('location_display', lang)}${match.location}
` +
        `${getPhrase('hobbies_display', lang)}${Array.isArray(match.hobbies) ? match.hobbies.join(', ') : match.hobbies || getPhrase('none', lang)}
` +
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
bot.action('begin_signup', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!botState.active && !adminList.includes(userId)) {
        return ctx.reply(getPhrase('bot_off_message', 'en'));
    }
    users[userId] = { 
        id: userId, 
        step: 'SETUP_PROFILE', 
        hobbies: [], 
        language: 'en',
        setupStep: null
    };
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
```