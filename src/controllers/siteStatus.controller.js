const settingsRepo = require('../repositories/settings.repository');
const waitlistRepo = require('../repositories/waitlist.repository');
const { sendEmail } = require('../../utils/email');

function buildClosedEmail({ imageUrls }) {
  const subject = 'SITE CLOSED — YOU’RE ON THE LIST';
  const images = Array.isArray(imageUrls) ? imageUrls : [];
  const mainImage = images[0] || 'https://placehold.co/600x400/000000/FFFFFF/png?text=F%3EF';

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 48px 40px; text-align: center; border: 1px solid #ff3b3b;">
      <h1 style="font-family: 'Arial Black', Impact, sans-serif; letter-spacing: -2px; font-size: 52px; margin: 0; font-weight: 900;">F<span style="color: #ff3b3b;">&gt;</span>F</h1>
      <p style="text-transform: uppercase; letter-spacing: 6px; font-size: 10px; color: #ff3b3b; margin: 6px 0 0; font-weight: 700;">We’re taking a short break</p>

      <div style="margin: 36px 0;">
        <img src="${mainImage}" alt="Faith Over Fear" style="width: 100%; max-height: 360px; object-fit: cover; border: 1px solid #222; border-radius: 12px;" />
      </div>

      <h2 style="text-transform: uppercase; letter-spacing: 1px; font-size: 22px; margin: 0 0 12px; color: #fff; font-weight: 900;">You’ll be notified when we’re live again.</h2>
      <p style="font-size: 14px; color: #b3b3b3; margin: 0 0 28px; line-height: 1.6;">Thanks for joining. New drops will be announced the moment the site opens.</p>
    </div>
  `;

  return { subject, html };
}

function buildLiveEmail({ shopUrl }) {
  const subject = 'WE’RE OPEN — SHOP THE DROP';
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 48px 40px; text-align: center; border: 1px solid #ff3b3b;">
      <h1 style="font-family: 'Arial Black', Impact, sans-serif; letter-spacing: -2px; font-size: 52px; margin: 0; font-weight: 900;">F<span style="color: #ff3b3b;">&gt;</span>F</h1>
      <p style="text-transform: uppercase; letter-spacing: 6px; font-size: 10px; color: #ff3b3b; margin: 6px 0 0; font-weight: 700;">Now Open For Sale</p>

      <h2 style="text-transform: uppercase; letter-spacing: 1px; font-size: 28px; margin: 22px 0 12px; color: #fff; font-weight: 900;">The wait is over.</h2>
      <p style="font-size: 14px; color: #b3b3b3; margin: 0 0 28px; line-height: 1.6;">We’re officially live. Shop the collection while quantities last.</p>

      <a href="${shopUrl}" style="background: #ff3b3b; color: #fff; text-decoration: none; padding: 18px 48px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; font-size: 12px; display: inline-block; border-radius: 6px;">Shop Now</a>
    </div>
  `;

  return { subject, html };
}

async function broadcastSubscribers(req, res) {
  try {
    const settings = await settingsRepo.getSettings();
    const siteStatus = String(settings.siteStatus || 'closed').toLowerCase();

    const closedImagesValue = settings.siteClosedImages;
    let imageUrls = [];
    if (typeof closedImagesValue === 'string') {
      const trimmed = closedImagesValue.trim();
      if (trimmed.startsWith('[')) {
        try {
          imageUrls = JSON.parse(trimmed);
        } catch {
          imageUrls = [];
        }
      } else {
        // fallback comma split
        imageUrls = trimmed.split(',').map(s => s.trim()).filter(Boolean);
      }
    } else if (Array.isArray(closedImagesValue)) {
      imageUrls = closedImagesValue;
    }

    // When the site is OPEN we announce to EVERY subscriber (reopening is an
    // event everyone should hear, even those already notified while closed).
    // When CLOSED we only confirm to newly-unnotified signups.
    const isLive = siteStatus === 'live';
    const rawEntries = isLive
      ? await waitlistRepo.findAll()
      : await waitlistRepo.findUnnotified(5000);
    const entries = rawEntries.filter(e => e && e.email);

    if (entries.length === 0) {
      return res.status(200).json({
        success: true,
        sent: 0,
        markedNotified: 0,
        status: siteStatus,
        message: isLive ? 'No subscribers to notify that we are open.' : 'No unnotified subscribers.'
      });
    }

    const hasResend = !!(process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY);
    console.log(`📧 [BROADCAST] Resend configured: ${hasResend} | siteStatus: ${siteStatus} | recipients: ${entries.length} (${isLive ? 'all subscribers' : 'unnotified only'})`);
    const shopUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://faithoverfearrw.netlify.app/shop.html';

    const { subject, html } = siteStatus === 'live'
      ? buildLiveEmail({ shopUrl: `${shopUrl}` })
      : buildClosedEmail({ imageUrls });

    // If Resend isn't configured we must NOT mark entries notified,
    // otherwise they'd be permanently skipped without ever receiving an email.
    if (!hasResend) {
      return res.status(200).json({
        success: true,
        sent: 0,
        markedNotified: 0,
        status: siteStatus,
        warning: 'RESEND_API_KEY (or EMAIL_API_KEY) is not configured on the backend. No emails were sent. Set the key and restart the backend, then broadcast again.'
      });
    }

    const results = await Promise.allSettled(
      entries.map(e => sendEmail({ email: e.email, subject, html }))
    );

    const sentIds = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        sentIds.push(entries[i].id);
      } else {
        console.error(`❌ [BROADCAST] Failed to send to ${entries[i].email}:`, r.reason?.message || r.reason);
      }
    });

    const sentCount = sentIds.length;
    console.log(`📧 [BROADCAST] Attempted: ${entries.length} | Sent OK: ${sentCount} | Failed: ${entries.length - sentCount}`);
    if (sentIds.length > 0) {
      await waitlistRepo.markNotified(sentIds);
    }

    return res.json({
      success: true,
      sent: sentCount,
      markedNotified: sentIds.length,
      status: siteStatus,
      warning: sentCount < entries.length ? `${entries.length - sentCount} email(s) failed to send.` : null
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Broadcast failed' });
  }
}

module.exports = {
  broadcastSubscribers,
};

