const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'faith_over_fear'
});

connection.connect((err) => {
    if (err) {
        console.error('Connection error: ' + err.stack);
        process.exit(1);
    }
    console.log('Connected.');

    connection.query('DROP TABLE IF EXISTS announcements', (err) => {
        if (err) throw err;
        console.log('Dropped.');

        connection.query(`
      CREATE TABLE announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_enabled BOOLEAN DEFAULT TRUE,
        version INT NOT NULL DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `, (err) => {
            if (err) throw err;
            console.log('Created.');

            connection.query(\`
        INSERT INTO announcements (id, title, message, is_enabled, version)
        VALUES (1, 'NEW DROP IS HERE', 'Experience the latest "Faith Over Fear" collection. Limited pieces available.', true, 1)
      \`, (err) => {
        if (err) throw err;
        console.log('Seeded.');
        connection.end();
        process.exit(0);
      });
    });
  });
});
