/**
 * TrainerHub — App Store Connect auto-fill script
 *
 * Paste into Chrome DevTools Console on the v1.0 distribution page:
 * https://appstoreconnect.apple.com/apps/6765562042/distribution/ios/version/inflight
 *
 * Works with React-controlled inputs by triggering synthetic events.
 */
(function fillASC() {
  function setField(id, value) {
    const el = document.getElementById(id);
    if (!el) { console.warn('Field not found:', id); return false; }
    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✓', id, `(${value.length} chars)`);
    return true;
  }

  const DESCRIPTION = `TrainerHub is the all-in-one platform for personal trainers and their clients.

FOR TRAINERS
Run your entire coaching business from your phone. Accept new client requests, schedule sessions, track completed workouts, and get paid — all in one place.

• Client Management — Keep profiles, goals, and session notes for every client in one organized view.
• Smart Scheduling — Create your availability windows, let clients book sessions, and get instant notifications when a new request comes in.
• Session Tracking — Mark sessions complete, add notes, and build a full history of every client's progress.
• Training Programs — Build reusable workout programs and assign them directly to clients.
• Revenue Dashboard — See your monthly earnings, session counts, and booking trends at a glance.
• Stripe Payouts — Connect your Stripe account once and get paid automatically for every completed session.

FOR CLIENTS
Book your trainer, view your upcoming sessions, and follow your custom programs — all from your phone.

• Instant Booking — Request sessions directly from your trainer's live availability calendar.
• Your Schedule — See every upcoming session with date, time, and duration in one clear view.
• Custom Programs — Access the workout programs your trainer built specifically for you.
• Session History — Review completed sessions and notes from past workouts.

SIMPLE. SECURE. PROFESSIONAL.
TrainerHub uses industry-standard security to keep client data private and payments safe. Sign in with a one-tap email code — no password to remember.

Whether you're a solo trainer scaling your client base or a dedicated athlete following a personalized program, TrainerHub keeps everyone on the same page.

Download free and get started today.`;

  const REVIEW_NOTES = `Demo account for review (email OTP — no password):

Email: review@trainerhub.app
Login: Enter the email on the Sign In screen → tap "Send Code" → enter the OTP sent to that inbox.

Pre-loaded with: 3 sample clients, 5 upcoming sessions, 2 training programs, Stripe in test mode.

Note: TrainerHub uses Supabase email OTP — there is no password. If the review team cannot receive the OTP, please contact support@trainerhub.app and we will provide it within 1 business day.`;

  setField('description',   DESCRIPTION);
  setField('keywords',      'personal trainer,fitness,workout,coaching,trainer app,clients,schedule,sessions,strength,gym');
  setField('supportUrl',    'https://trainerhub.app/support');
  setField('marketingUrl',  'https://trainerhub.app');
  setField('copyright',     '2025 TrainerHub');
  setField('notes',         REVIEW_NOTES);   // App Review notes field

  console.log('\n✅ All fields filled. Click SAVE in the top-right corner.');
  console.log('\nNext: click "App Information" in the left sidebar to set:');
  console.log('  • Subtitle: Train Smarter. Grow Faster.');
  console.log('  • Primary Category: Health & Fitness');
  console.log('  • Secondary Category: Business');
  console.log('  • Privacy Policy URL: https://trainerhub.app/privacy');
})();
