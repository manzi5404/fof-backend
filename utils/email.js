const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY);

const RESEND_SENDER = process.env.EMAIL_FROM || 'onboarding@resend.dev';

async function sendEmail({ email, subject, message, html }) {
    const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;

    if (!apiKey) {
        console.warn('⚠️  [EMAIL_SERVICE] NOT_CONFIGURED: Missing RESEND_API_KEY. Email suppressed.');
        console.log(`[STUB] To: ${email}\n[STUB] Subject: ${subject}`);
        return;
    }

    try {
        console.log(`📨 [EMAIL_SERVICE] Attempting delivery to: ${email}...`);
        
        const data = await resend.emails.send({
            from: RESEND_SENDER,
            to: email,
            subject: subject,
            html: html || message
        });

        console.log(`✅ [EMAIL_SERVICE] Success for ${email}:`, data.data?.id);
    } catch (error) {
        console.error(`❌ [EMAIL_SERVICE] Delivery failed for ${email}:`, error.message);
        throw error;
    }
}

async function notifyNewDrop(userEmails, dropDetails) {
    const { title, name, description, image_url } = dropDetails;
    const dropName = title || name || 'New Collection';
    const dropDesc = description || 'Our latest collection has arrived. Explore the spirit of resilience.';
    const dropImage = image_url || 'https://placehold.co/600x400/000000/FFFFFF/png?text=F%3ef+NEW+DROP';
    const shopUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://faithoverfear.rw';

    const subject = `NEW DROP: ${dropName} - Now Live`;
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #000;">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #0a0a0a; border-radius: 16px; overflow: hidden;">
                            <!-- Header -->
                            <tr>
                                <td align="center" style="padding: 40px 40px 20px;">
                                    <h1 style="margin: 0; font-size: 42px; font-weight: 900; color: #fff; letter-spacing: -2px;">F<span style="color: #ff3b3b;">&gt;</span>F</h1>
                                    <p style="margin: 8px 0 0; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 4px; font-weight: 600;">Faith Over Fear</p>
                                </td>
                            </tr>
                            
                            <!-- Image with hover effect -->
                            <tr>
                                <td align="center" style="padding: 20px 40px;">
                                    <div style="display: inline-block; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                                        <img src="${dropImage}" alt="${dropName}" width="520" style="display: block; max-width: 100%; height: auto; border-radius: 12px; transition: transform 0.3s ease;">
                                    </div>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td align="center" style="padding: 20px 40px 30px;">
                                    <h2 style="margin: 0 0 16px; font-size: 26px; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: -0.5px;">${dropName}</h2>
                                    <p style="margin: 0; font-size: 15px; color: #aaa; line-height: 1.6; max-width: 400px;">${dropDesc}</p>
                                </td>
                            </tr>
                            
                            <!-- CTA Button -->
                            <tr>
                                <td align="center" style="padding: 0 40px 40px;">
                                    <a href="https://tinyurl.com/faithoverfearrw/shop" style="display: inline-block; background: #fff; color: #000; text-decoration: none; padding: 18px 48px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; border-radius: 6px; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(255,255,255,0.1);">Shop the Drop Now</a>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td align="center" style="padding: 30px 40px; border-top: 1px solid #222;">
                                    <table role="presentation" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td align="center">
                                                <a href="https://instagram.com/faithoverfear.rw_" style="display: inline-block; margin: 0 12px; color: #888; text-decoration: none; font-size: 12px;">Instagram</a>
                                                <span style="color: #444; margin: 0 8px;">|</span>
                                                <a href="mailto:faithoverfearsupport@gmail.com" style="display: inline-block; margin: 0 12px; color: #888; text-decoration: none; font-size: 12px;">Support</a>
                                            </td>
                                        </tr>
                                    </table>
                                    <p style="margin: 20px 0 0; font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 2px;">&copy; 2026 Faith Over Fear. All Rights Reserved.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;

    console.log(`[BATCH_NOTIFY] Initializing mailing for ${userEmails.length} subscribers...`);
    const results = await Promise.allSettled(userEmails.map(email => sendEmail({ email, subject, html })));
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`[BATCH_NOTIFY] Completed. Success: ${successful} | Failed: ${failed}`);
}

async function notifyLiveDrop(userEmails, dropDetails) {
    const { title, name, description, image_url } = dropDetails;
    const dropName = title || name || 'New Drop';
    const dropImage = image_url || 'https://placehold.co/600x400/000000/FFFFFF/png?text=F%3EF+LIVE+NOW';
    const shopUrl = process.env.CLIENT_URL || 'https://faithoverfear.rw';

    const subject = `🔥 ${dropName} IS LIVE NOW!`;
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 40px; text-align: center; border: 2px solid #f33;">
            <h1 style="letter-spacing: -2px; font-size: 48px; margin-bottom: 0;">F&gt;F</h1>
            <p style="text-transform: uppercase; letter-spacing: 5px; font-size: 10px; color: #f33; margin-top: 5px; font-weight: bold;">Live Release</p>
            
            <div style="margin: 40px 0;">
                <img src="${dropImage}" alt="${dropName}" style="width: 100%; max-height: 400px; object-fit: cover; border: 1px solid #444;">
            </div>
            
            <h2 style="text-transform: uppercase; font-size: 32px; margin-bottom: 10px; color: #fff; font-weight: 900;">NO MORE WAITING.</h2>
            <p style="font-size: 16px; color: #ccc; margin-bottom: 30px;">The <strong>${dropName}</strong> collection is officially live. Quantities are extremely limited.</p>
            
            <a href="${shopUrl}/shop.html" style="background: #f33; color: #fff; text-decoration: none; padding: 20px 60px; font-weight: 900; text-transform: uppercase; font-size: 12px; letter-spacing: 4px; display: inline-block;">Shop Now</a>
            
            <div style="margin-top: 60px; padding-top: 30px; border-top: 1px solid #111; font-size: 10px; color: #444; text-transform: uppercase; letter-spacing: 2px;">
                &copy; 2026 Faith Over Fear. Resilience Over Comfort.
            </div>
        </div>
    `;

    console.log(`[LIVE_BATCH] Broadcasting live alert to ${userEmails.length} users...`);
    const results = await Promise.allSettled(userEmails.map(email => sendEmail({ email, subject, html })));
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`[LIVE_BATCH] Broadcasting finished. Success: ${successful} | Failed: ${failed}`);
}

async function notifyReservation(userEmail, reservationData, productData) {
    const { fullName, phone, size, color, quantity, storeMode } = reservationData;
    const productName = productData?.name || 'Product';
    const productPrice = productData?.price ? `${productData.price.toLocaleString()} FRW` : 'N/A';
    const productImage = (productData?.image_urls && productData.image_urls.length > 0) ? productData.image_urls[0] : 'https://placehold.co/400x400?text=F%3EF+Reservations';

    const subject = `RESERVATION CONFIRMED: ${productName}`;
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 40px; text-align: center;">
            <h1 style="letter-spacing: -2px; font-size: 48px; margin-bottom: 0;">F&gt;F</h1>
            <p style="text-transform: uppercase; letter-spacing: 5px; font-size: 10px; color: #888; margin-top: 5px;">Faith Over Fear</p>
            
            <div style="margin: 40px 0;">
                <img src="${productImage}" alt="${productName}" style="width: 100%; max-width: 300px; border: 1px solid #333;">
            </div>
            
            <h2 style="text-transform: uppercase; font-size: 24px; margin-bottom: 10px;">${productName} Reserved</h2>
            <p style="font-size: 16px; color: #aaa; margin-bottom: 30px;">
                We've received your reservation for the <strong>${productName}</strong>.<br>
                Mode: <span style="color: #fff; text-transform: uppercase;">${storeMode}</span>
            </p>
            
            <div style="background: #111; padding: 20px; border: 1px solid #222; text-align: left; margin-bottom: 30px;">
                <p style="margin: 5px 0; font-size: 12px; color: #888;">Size: <span style="color: #fff;">${size}</span></p>
                <p style="margin: 5px 0; font-size: 12px; color: #888;">Color: <span style="color: #fff;">${color}</span></p>
                <p style="margin: 5px 0; font-size: 12px; color: #888;">Quantity: <span style="color: #fff;">${quantity}</span></p>
                <p style="margin: 5px 0; font-size: 12px; color: #888;">Price: <span style="color: #fff;">${productPrice}</span></p>
            </div>
            
            <p style="font-size: 14px; color: #888; margin-bottom: 40px;">Our team will contact you shortly via ${phone} for final fulfillment details.</p>
            
            <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #222; font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 1px;">
                &copy; 2026 Faith Over Fear. Movement of Resilience.
            </div>
        </div>
    `;

    await sendEmail({ email: userEmail, subject, html });

    if (process.env.ADMIN_EMAIL) {
        await sendEmail({
            email: process.env.ADMIN_EMAIL,
            subject: `🚨 NEW RESERVATION ALERT: ${fullName}`,
            message: `New reservation received from ${fullName} (${userEmail}) for ${productName}. Phone: ${phone}. Mode: ${storeMode}.`
        });
    }
}

module.exports = {
    sendEmail,
    notifyNewDrop,
    notifyLiveDrop,
    notifyReservation
};
