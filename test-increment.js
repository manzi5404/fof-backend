const { pool } = require('./db/connection');
const announcementModel = require('./models/announcement');


async function testDrops() {
  const [rows] = await pool.query('SELECT * FROM drops WHERE status="live"');
  console.log(rows);
}

testDrops();
async function testUpdate() {
    try {
        console.log('Testing version increment...');

        // Initial state
        const initial = await announcementModel.getLatestAnnouncement();
        console.log('Initial version:', initial.version);

        // Update
        await announcementModel.updateAnnouncement({
            title: 'UPDATED DROP',
            message: 'Checking version increment.',
            is_enabled: true
        });

        const updated = await announcementModel.getLatestAnnouncement();
        console.log('Updated version:', updated.version);

        if (updated.version > initial.version) {
            console.log('✅ Version incremented successfully.');
        } else {
            console.error('❌ Version did not increment.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

testUpdate();
