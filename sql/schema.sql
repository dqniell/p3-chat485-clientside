PRAGMA foreign_keys = ON; 
CREATE TABLE users (
    userid INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname VARCHAR(255) NOT NULL, 
    email VARCHAR(255) NOT NULL UNIQUE, 
    password VARCHAR(255) NOT NULL, 
    created DATETIME DEFAULT CURRENT_TIMESTAMP
); 

CREATE TABLE sessions ( 
    sessionid VARCHAR(36) PRIMARY KEY,
    userid INTEGER,
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE
); 

CREATE TABLE conversations (
    conversationid INTEGER PRIMARY KEY AUTOINCREMENT, 
    uuid VARCHAR(36) NOT NULL UNIQUE,
    sessionid VARCHAR(36),
    userid INTEGER,
    title VARCHAR(255),
    created DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sessionid) 
    REFERENCES sessions(sessionid) 
    ON DELETE CASCADE,

    FOREIGN KEY (userid) 
    REFERENCES users(userid) 
    ON DELETE CASCADE,

    CHECK (
        (sessionid IS NOT NULL AND userid IS NULL)
        OR
        (sessionid IS NULL AND userid IS NOT NULL)
    )
);

CREATE TABLE messages (
    messageid INTEGER PRIMARY KEY AUTOINCREMENT, 
    conversationid INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL, 
    created DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (conversationid)
    REFERENCES conversations(conversationid)
    ON DELETE CASCADE,

    CHECK (
        (role IN ('user', 'assistant', 'system'))
    )
);